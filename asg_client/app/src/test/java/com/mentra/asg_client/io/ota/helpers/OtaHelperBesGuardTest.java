package com.mentra.asg_client.io.ota.helpers;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import com.mentra.asg_client.io.ota.interfaces.IBesOtaController;
import com.mentra.asg_client.io.ota.interfaces.IBesOtaRegistry;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Focused guard-path tests for {@link OtaHelper} after the migration from {@code
 * BesOtaManager.isBesOtaInProgress} static reads to null-safe {@link IBesOtaRegistry} lookups.
 * Full {@code OtaHelper} coverage is out of scope (B3 splits the class); these tests pin the two
 * regression risks of this refactor: NPEs when no controller exists, and the in-progress guard no
 * longer being consulted.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 33)
public class OtaHelperBesGuardTest {

    /** Simple registry stub whose controller can be swapped per test. */
    private static final class StubRegistry implements IBesOtaRegistry {
        private IBesOtaController controller;

        @Override
        public IBesOtaController getInstance() {
            return controller;
        }

        @Override
        public void setInstance(IBesOtaController controller) {
            this.controller = controller;
        }

        @Override
        public void clear() {
            this.controller = null;
        }
    }

    private OtaHelper otaHelper;

    @After
    public void tearDown() {
        if (otaHelper != null) {
            otaHelper.cleanup();
        }
    }

    private OtaHelper newHelper(StubRegistry registry) {
        Context context = ApplicationProvider.getApplicationContext();
        otaHelper = new OtaHelper(context, registry);
        return otaHelper;
    }

    @Test
    public void noController_startupPrune_doesNotThrow() {
        // Non-K900 reality: the registry never gets a controller. Every BES-progress check must
        // behave as "not in progress" without NPE.
        OtaHelper helper = newHelper(new StubRegistry());

        assertThatCode(helper::pruneInvalidCachedArtifactsOnStartup).doesNotThrowAnyException();
    }

    @Test
    public void activeController_startupPrune_consultsInProgressGuard() {
        StubRegistry registry = new StubRegistry();
        IBesOtaController controller = mock(IBesOtaController.class);
        when(controller.isBesOtaInProgress()).thenReturn(true);
        registry.setInstance(controller);

        OtaHelper helper = newHelper(registry);
        helper.pruneInvalidCachedArtifactsOnStartup();

        // The BES cache-prune branch must consult the controller's in-progress state.
        verify(controller, atLeastOnce()).isBesOtaInProgress();
    }

    @Test
    public void controllerRemovedAfterConstruction_doesNotThrow() {
        // Registry is a late-binding seam: the controller can disappear during service shutdown.
        StubRegistry registry = new StubRegistry();
        registry.setInstance(mock(IBesOtaController.class));
        OtaHelper helper = newHelper(registry);

        registry.clear();

        assertThatCode(helper::pruneInvalidCachedArtifactsOnStartup).doesNotThrowAnyException();
    }
}
