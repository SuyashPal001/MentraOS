package com.mentra.asg_client.di.hilt;

import com.mentra.asg_client.io.bluetooth.managers.mentralive.internal.K900ProtocolStrategy;
import com.mentra.asg_client.service.core.processors.CommandProtocolDetector;
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import dagger.multibindings.IntoSet;

/**
 * Vendor wiring for the companion transport layer. Binds device-specific implementations (selected
 * via the existing factories) to the core transport interfaces, and contributes vendor protocol
 * detection strategies to the core {@link CommandProtocolDetector}.
 */
@Module
@InstallIn(SingletonComponent.class)
public class TransportModule {

    /**
     * Mentra Live MCU wire-format detection. Registered into the core protocol detector at
     * runtime so core never imports vendor classes.
     */
    @Provides
    @IntoSet
    static CommandProtocolDetector.ProtocolDetectionStrategy provideK900ProtocolStrategy() {
        return new K900ProtocolStrategy();
    }
}
