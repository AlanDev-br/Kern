package com.alan.kern;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;
import java.util.Calendar;

public class LimitadorService extends Service {
    private static final String CHANNEL_ID = "KernLimiterChannel";
    private static final int NOTIFICATION_ID = 1090;
    private boolean running = false;
    private Thread monitorThread;
    private String lastPkg = null;

    @Override
    public void onCreate() {
        super.onCreate();
        criarCanalNotificacao();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Kern: Limitador de Foco")
                .setContentText("Monitorando seus limites de tempo de tela.")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

        startForeground(NOTIFICATION_ID, notification);

        if (!running) {
            running = true;
            iniciarMonitoramento();
        }

        return START_STICKY;
    }

    private void iniciarMonitoramento() {
        monitorThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (running) {
                    try {
                        verificarLimites();
                        Thread.sleep(1500); // verifica a cada 1.5 segundos
                    } catch (InterruptedException e) {
                        break;
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        });
        monitorThread.start();
    }

    private void verificarLimites() {
        SharedPreferences prefs = getSharedPreferences("KernLimiter", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("limiter_enabled", false);
        if (!enabled) {
            stopSelf();
            return;
        }

        String currentPkg = getForegroundPackage(this);
        if (currentPkg == null) return;

        // Se o app atual for o Kern ou o Launcher do Android, ignora
        if (currentPkg.equals(getPackageName()) || currentPkg.contains("launcher") || currentPkg.contains("home") || currentPkg.contains("systemui")) {
            lastPkg = currentPkg;
            return;
        }

        String limitsJsonStr = prefs.getString("limits_json", "{}");
        try {
            JSONObject limits = new JSONObject(limitsJsonStr);
            if (limits.has(currentPkg)) {
                // Esse app tem limite configurado!
                int limitMin = limits.getInt(currentPkg);
                if (limitMin > 0) {
                    long usageMs = getTodayUsageMs(this, currentPkg);
                    long usageMin = usageMs / 60000;

                    if (usageMin >= limitMin) {
                        // Limite excedido! Bloquear.
                        if (!currentPkg.equals(lastPkg)) {
                            bloquearApp(currentPkg);
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        lastPkg = currentPkg;
    }

    private void bloquearApp(final String pkgName) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                // Salvar no SharedPreferences para o React saber qual app foi bloqueado
                SharedPreferences prefs = getSharedPreferences("KernLimiter", Context.MODE_PRIVATE);
                prefs.edit().putString("last_blocked_app", pkgName).apply();

                // 1. Redirecionar para home screen
                Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                homeIntent.addCategory(Intent.CATEGORY_HOME);
                homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(homeIntent);

                // 2. Abrir o Kern para mostrar o overlay de bloqueio
                Intent blockIntent = new Intent(LimitadorService.this, MainActivity.class);
                blockIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(blockIntent);
            }
        });
    }

    private String getForegroundPackage(Context context) {
        UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return null;
        long time = System.currentTimeMillis();
        UsageEvents events = usm.queryEvents(time - 12000, time);
        UsageEvents.Event event = new UsageEvents.Event();
        String foregroundPackage = null;
        long latestTime = 0;
        while (events.hasNextEvent()) {
            events.getNextEvent(event);
            if (event.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) {
                if (event.getTimeStamp() > latestTime) {
                    foregroundPackage = event.getPackageName();
                    latestTime = event.getTimeStamp();
                }
            }
        }
        return foregroundPackage;
    }

    private long getTodayUsageMs(Context context, String packageName) {
        UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return 0;
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long inicio = cal.getTimeInMillis();
        long fim = System.currentTimeMillis();

        UsageEvents eventos = usm.queryEvents(inicio, fim);
        UsageEvents.Event ev = new UsageEvents.Event();
        long totalMs = 0;
        long ini = -1;

        while (eventos.hasNextEvent()) {
            eventos.getNextEvent(ev);
            if (!ev.getPackageName().equals(packageName)) continue;
            int tipo = ev.getEventType();
            long ts = ev.getTimeStamp();

            if (tipo == UsageEvents.Event.ACTIVITY_RESUMED) {
                if (ini == -1) ini = ts;
            } else if (tipo == UsageEvents.Event.ACTIVITY_PAUSED) {
                if (ini != -1 && ts > ini) {
                    totalMs += (ts - ini);
                    ini = -1;
                }
            } else if (tipo == UsageEvents.Event.SCREEN_NON_INTERACTIVE
                    || tipo == UsageEvents.Event.KEYGUARD_SHOWN
                    || tipo == UsageEvents.Event.DEVICE_SHUTDOWN) {
                if (ini != -1 && ts > ini) {
                    totalMs += (ts - ini);
                }
                ini = -1;
            }
        }
        if (ini != -1 && fim > ini) {
            totalMs += (fim - ini);
        }
        return totalMs;
    }

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Kern Limitador",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notificação do limitador de foco de tempo de tela");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        running = false;
        if (monitorThread != null) {
            monitorThread.interrupt();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
