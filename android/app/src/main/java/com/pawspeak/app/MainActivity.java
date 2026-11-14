package com.pawspeak.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registered before super.onCreate so the bridge can resolve it during load.
        registerPlugin(PetDetectorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
