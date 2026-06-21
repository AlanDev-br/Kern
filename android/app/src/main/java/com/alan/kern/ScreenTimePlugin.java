package com.alan.kern;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
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

import java.util.Calendar;
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
        ret.put("mode", modoAppOps()); // diagnóstico
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Context ctx = getContext();
        // tenta abrir direto na página do app; cai pra lista geral se não suportado
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
     * Retorna o tempo em primeiro plano (ms) por pacote, agregado desde o início
     * do dia até agora. { apps: [{ packageName, totalMs }] }
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

        Map<String, UsageStats> stats = usm.queryAndAggregateUsageStats(inicio, fim);
        JSArray apps = new JSArray();
        if (stats != null) {
            for (Map.Entry<String, UsageStats> e : stats.entrySet()) {
                long total = e.getValue().getTotalTimeInForeground();
                if (total <= 0) continue;
                JSObject o = new JSObject();
                o.put("packageName", e.getKey());
                o.put("totalMs", total);
                apps.put(o);
            }
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }
}
