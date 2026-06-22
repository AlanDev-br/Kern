package com.alan.kern;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.content.SharedPreferences;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

/**
 * Plugin nativo que lê o tempo de uso por app via UsageStatsManager do Android.
 * Requer a permissão especial PACKAGE_USAGE_STATS, concedida manualmente pelo
 * usuário em Ajustes > Acesso ao uso. Só funciona no APK (não na web).
 */
@CapacitorPlugin(name = "ScreenTime")
public class ScreenTimePlugin extends Plugin {

    /** Retorna o modo bruto do AppOps (para diagnóstico). */
    private int modoAppOps() {
        Context ctx = getContext();
        AppOpsManager appOps = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return AppOpsManager.MODE_ERRORED;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.getPackageName());
        }
        return appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.getPackageName());
    }

    private boolean temPermissao() {
        int mode = modoAppOps();
        if (mode == AppOpsManager.MODE_ALLOWED) return true;
        // Em vários aparelhos o AppOps volta MODE_DEFAULT mesmo após autorizar;
        // nesse caso confirmamos pela permissão declarada de fato.
        if (mode == AppOpsManager.MODE_DEFAULT) {
            return getContext().checkCallingOrSelfPermission(
                    android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED;
        }
        return false;
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", temPermissao());
        ret.put("mode", modoAppOps());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Context ctx = getContext();
        Intent direto = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        direto.setData(Uri.fromParts("package", ctx.getPackageName(), null));
        direto.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(direto);
        } catch (Exception e) {
            Intent lista = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            lista.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(lista);
        }
        call.resolve();
    }

    /**
     * Tempo real em primeiro plano por app, somando os intervalos entre abrir
     * (RESUMED) e fechar (PAUSED) cada app no dia. Fecha sessões abertas quando a
     * tela apaga / bloqueia, igual ao "Bem-estar digital". Bem mais preciso que o
     * getTotalTimeInForeground, que costuma inflar os números.
     */
    @PluginMethod
    public void getTodayUsage(PluginCall call) {
        if (!temPermissao()) {
            call.reject("Permissão de acesso ao uso não concedida");
            return;
        }

        UsageStatsManager usm = (UsageStatsManager) getContext()
                .getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) {
            call.reject("UsageStatsManager indisponível");
            return;
        }

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long inicio = cal.getTimeInMillis();
        long fim = System.currentTimeMillis();

        Map<String, Long> totais = new HashMap<>();   // pacote -> ms acumulados
        Map<String, Long> abertos = new HashMap<>();   // pacote -> timestamp de abertura

        UsageEvents eventos = usm.queryEvents(inicio, fim);
        UsageEvents.Event ev = new UsageEvents.Event();

        while (eventos.hasNextEvent()) {
            eventos.getNextEvent(ev);
            int tipo = ev.getEventType();
            String pkg = ev.getPackageName();
            long ts = ev.getTimeStamp();

            if (tipo == UsageEvents.Event.ACTIVITY_RESUMED) {
                // mantém a primeira abertura caso venham RESUMED seguidos
                if (!abertos.containsKey(pkg)) abertos.put(pkg, ts);
            } else if (tipo == UsageEvents.Event.ACTIVITY_PAUSED) {
                Long ini = abertos.remove(pkg);
                if (ini != null && ts > ini) {
                    totais.merge(pkg, ts - ini, Long::sum);
                }
            } else if (tipo == UsageEvents.Event.SCREEN_NON_INTERACTIVE
                    || tipo == UsageEvents.Event.KEYGUARD_SHOWN
                    || tipo == UsageEvents.Event.DEVICE_SHUTDOWN) {
                // tela apagou/bloqueou: fecha tudo que estava aberto nesse instante
                for (Map.Entry<String, Long> e : abertos.entrySet()) {
                    if (ts > e.getValue()) totais.merge(e.getKey(), ts - e.getValue(), Long::sum);
                }
                abertos.clear();
            }
        }

        // fecha sessões ainda abertas no fim da janela (agora)
        for (Map.Entry<String, Long> e : abertos.entrySet()) {
            if (fim > e.getValue()) totais.merge(e.getKey(), fim - e.getValue(), Long::sum);
        }

        JSArray apps = new JSArray();
        for (Map.Entry<String, Long> e : totais.entrySet()) {
            if (e.getValue() <= 0) continue;
            JSObject o = new JSObject();
            o.put("packageName", e.getKey());
            o.put("totalMs", e.getValue());
            apps.put(o);
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }

    @PluginMethod
    public void setAppLimits(PluginCall call) {
        JSObject limits = call.getObject("limits");
        Boolean enabled = call.getBoolean("enabled", false);

        SharedPreferences prefs = getContext().getSharedPreferences("KernLimiter", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putBoolean("limiter_enabled", enabled);
        if (limits != null) {
            editor.putString("limits_json", limits.toString());
        }
        editor.apply();

        // Controlar a inicialização do serviço
        Intent serviceIntent = new Intent(getContext(), LimitadorService.class);
        try {
            if (enabled) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(serviceIntent);
                } else {
                    getContext().startService(serviceIntent);
                }
            } else {
                getContext().stopService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        call.resolve();
    }

    @PluginMethod
    public void getLimiterState(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("KernLimiter", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("limiter_enabled", false);
        String limitsJson = prefs.getString("limits_json", "{}");
        String lastBlockedApp = prefs.getString("last_blocked_app", null);
        boolean hasOverlayPermission = true;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            hasOverlayPermission = Settings.canDrawOverlays(getContext());
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("hasOverlayPermission", hasOverlayPermission);
        ret.put("lastBlockedApp", lastBlockedApp);
        try {
            ret.put("limits", new JSObject(limitsJson));
        } catch (Exception e) {
            ret.put("limits", new JSObject());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void clearBlockedApp(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("KernLimiter", Context.MODE_PRIVATE);
        prefs.edit().remove("last_blocked_app").apply();
        call.resolve();
    }
}
