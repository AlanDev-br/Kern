package com.alan.kern;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registra o plugin nativo de tempo de tela antes de inicializar a bridge.
        registerPlugin(ScreenTimePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
