package com.wumar.netflixfix;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.provider.Settings;
import android.content.*;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.*;
import android.view.*;
import android.widget.*;
import java.net.*;
import java.util.concurrent.*;

public class MainActivity extends Activity {
    LinearLayout root, results; TextView status;
    final ExecutorService pool = Executors.newSingleThreadExecutor();
    final String NETFLIX = "com.netflix.mediaclient";
    @Override public void onCreate(Bundle b){ super.onCreate(b); buildUi(); runDiagnostics(); }
    TextView tv(String s,int sp){ TextView t=new TextView(this); t.setText(s); t.setTextColor(Color.WHITE); t.setTextSize(sp); t.setPadding(24,14,24,14); return t; }
    Button btn(String s, View.OnClickListener l){ Button b=new Button(this); b.setText(s); b.setOnClickListener(l); return b; }
    void buildUi(){
        ScrollView sv=new ScrollView(this); root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(18,18,18,28); root.setBackgroundColor(Color.rgb(10,10,12));
        root.addView(tv("WUMAR NETFLIX FIX",24)); root.addView(tv("مُشخّص وإصلاح موجّه لخطأ Netflix (-121)",16));
        status=tv("جاري الفحص…",15); root.addView(status); root.addView(btn("🔄 إعادة الفحص", v->runDiagnostics()));
        root.addView(btn("🕐 فتح إعدادات التاريخ والوقت", v->open(Settings.ACTION_DATE_SETTINGS)));
        root.addView(btn("📶 إعدادات Wi‑Fi", v->open(Settings.ACTION_WIFI_SETTINGS)));
        root.addView(btn("🌐 إعدادات الشبكة", v->open(Settings.ACTION_WIRELESS_SETTINGS)));
        if(Build.VERSION.SDK_INT>=28) root.addView(btn("🔐 إعدادات Private DNS", v->open("android.settings.PRIVATE_DNS_SETTINGS")));
        root.addView(btn("🛡️ إعدادات VPN", v->open(Settings.ACTION_VPN_SETTINGS)));
        root.addView(btn("🧹 صفحة Netflix: مسح البيانات/الكاش", v->openAppDetails(NETFLIX)));
        root.addView(btn("⬆️ فتح Netflix في Play Store", v->openStore())); root.addView(btn("▶️ تشغيل Netflix", v->launchNetflix()));
        root.addView(tv("نتائج التشخيص",20)); results=new LinearLayout(this); results.setOrientation(LinearLayout.VERTICAL); root.addView(results); sv.addView(root); setContentView(sv);
    }
    void open(String action){ try{ startActivity(new Intent(action)); }catch(Exception e){ Toast.makeText(this,"الإعداد غير متاح على هذا الجهاز",Toast.LENGTH_LONG).show(); } }
    void openAppDetails(String pkg){ try{ Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS); i.setData(Uri.parse("package:"+pkg)); startActivity(i); }catch(Exception e){ Toast.makeText(this,"تعذر فتح صفحة التطبيق",Toast.LENGTH_LONG).show(); } }
    void openStore(){ try{ startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id="+NETFLIX))); }catch(Exception e){ startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id="+NETFLIX))); } }
    void launchNetflix(){ Intent i=getPackageManager().getLaunchIntentForPackage(NETFLIX); if(i!=null) startActivity(i); else Toast.makeText(this,"Netflix غير مثبت",Toast.LENGTH_LONG).show(); }
    void add(String s, boolean ok){ TextView t=tv((ok?"✅ ":"⚠️ ")+s,15); t.setBackgroundColor(ok?Color.rgb(20,45,25):Color.rgb(55,38,18)); results.addView(t); }
    void runDiagnostics(){ results.removeAllViews(); status.setText("جاري الفحص…"); pool.submit(()->{
        boolean network=false, validated=false, vpn=false, autoTime=false, autoTz=false, dnsOk=false, https=false;
        try { PackageInfo p=getPackageManager().getPackageInfo(NETFLIX,0); final String ver=p.versionName; runOnUiThread(()->add("Netflix مثبت، الإصدار: "+ver,true)); } catch(Exception e){ runOnUiThread(()->add("Netflix غير مثبت على الجهاز",false)); }
        ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE); Network n=cm.getActiveNetwork();
        if(n!=null){ NetworkCapabilities c=cm.getNetworkCapabilities(n); network=c!=null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET); validated=c!=null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED); vpn=c!=null && c.hasTransport(NetworkCapabilities.TRANSPORT_VPN); }
        final boolean fn=network,fv=validated,fvpn=vpn; runOnUiThread(()->{ add("اتصال إنترنت موجود",fn); add("الاتصال مُتحقق من النظام (VALIDATED)",fv); add("VPN نشط حاليًا: "+(fvpn?"نعم":"لا"),!fvpn); });
        if(Build.VERSION.SDK_INT>=17){ try{ autoTime=Settings.Global.getInt(getContentResolver(),Settings.Global.AUTO_TIME,0)==1; autoTz=Settings.Global.getInt(getContentResolver(),Settings.Global.AUTO_TIME_ZONE,0)==1; }catch(Exception ignored){} }
        final boolean fat=autoTime,fatz=autoTz; runOnUiThread(()->{ add("التاريخ والوقت تلقائيان",fat); add("المنطقة الزمنية تلقائية",fatz); });
        try { dnsOk=InetAddress.getByName("www.netflix.com")!=null; } catch(Exception ignored){} final boolean fdns=dnsOk; runOnUiThread(()->add("DNS يحل www.netflix.com",fdns));
        try { URL u=new URL("https://www.netflix.com/"); HttpURLConnection h=(HttpURLConnection)u.openConnection(); h.setConnectTimeout(7000); h.setReadTimeout(7000); h.setRequestMethod("HEAD"); h.connect(); https=h.getResponseCode()>0; h.disconnect(); } catch(Exception ignored){}
        final boolean fhttps=https; runOnUiThread(()->{ add("اتصال HTTPS إلى Netflix ناجح",fhttps); add("Android "+Build.VERSION.RELEASE+" | "+Build.MANUFACTURER+" "+Build.MODEL,true); add("ملاحظة: Android يمنع التطبيقات العادية من مسح بيانات Netflix أو تغيير Private DNS تلقائيًا. التطبيق يفتح لك الصفحة الصحيحة لتنفيذها يدويًا.",true); status.setText("اكتمل الفحص. نفّذ الخطوات التي عليها ⚠️ ثم أعد الفحص."); });
    }); }
    @Override protected void onDestroy(){ pool.shutdownNow(); super.onDestroy(); }
}
