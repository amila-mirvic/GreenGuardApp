package eu.greenguardapp.launchapplication;

import android.app.KeyguardManager;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;

public class LaunchApplicationModule extends ReactContextBaseJavaModule {

  @Nullable
  private String launchManagerData;
  private final ReactApplicationContext reactContext;

  public LaunchApplicationModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @NonNull
  @Override
  public String getName() {
    // zadržavamo isto ime koje koristi tvoj JS kod
    return "LaunchManager";
  }

  @ReactMethod
  public void openAppWithData(@Nullable String data) {
    this.launchManagerData = data;

    // Pronađi LAUNCHER intent za vlastiti paket
    Intent launchIntent = reactContext.getPackageManager()
            .getLaunchIntentForPackage(reactContext.getPackageName());

    if (launchIntent == null) {
      // fallback – pokreni glavnu LAUNCHER aktivnost
      launchIntent = new Intent(Intent.ACTION_MAIN);
      launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
      launchIntent.setPackage(reactContext.getPackageName());
    }

    // proslijedi podatke ako su došli
    if (data != null) {
      launchIntent.putExtra("launchManagerData", data);
    }

    // standardne intent flag kombinacije za otvaranje iz backgrounda
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    // Pokušaj nježno skinuti keyguard (bez deprecated API-ja)
    Activity current = getCurrentActivity();
    if (current != null) {
      KeyguardManager km =
          (KeyguardManager) reactContext.getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null && km.isKeyguardLocked() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        // Ne blokira; samo traži od sistema da spusti zaključavanje ako je moguće
        km.requestDismissKeyguard(current, null);
      }
    }

    reactContext.startActivity(launchIntent);
  }

  @ReactMethod
  public void getLaunchManagerData(Callback callback) {
    callback.invoke(this.launchManagerData);
  }

  @ReactMethod
  public void resetLaunchManagerData() {
    this.launchManagerData = null;
  }
}
