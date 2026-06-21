package com.alan.kern;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
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

    private boolean temPermissao() {
        Context ctx = getContext();
        AppOpsManager appOps = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    ctx.getPackageName());
        } else {
            mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    ctx.getPackageName());
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", temPermissao());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
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
