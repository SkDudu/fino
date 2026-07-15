package expo.modules.notificationlistener

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationListenerModule : Module() {
  companion object {
    @Volatile
    var instance: NotificationListenerModule? = null
  }

  override fun definition() = ModuleDefinition {
    Name("NotificationListener")

    Events("NotificationReceived")

    OnCreate {
      instance = this@NotificationListenerModule
    }

    OnDestroy {
      if (instance === this@NotificationListenerModule) {
        instance = null
      }
    }

    Function("isEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val enabled = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      ) ?: return@Function false
      enabled.split(":").any { it.contains(context.packageName) }
    }

    Function("openSettings") {
      appContext.reactContext?.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      )
      null
    }

    Function("drainPending") {
      val context = appContext.reactContext ?: return@Function emptyList<Bundle>()
      PendingStore.drain(context)
    }

    Function("getInstalledApps") {
      val context = appContext.reactContext ?: return@Function emptyList<Bundle>()
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
        .mapNotNull { resolve ->
          val pkg = resolve.activityInfo?.packageName ?: return@mapNotNull null
          if (pkg == context.packageName) return@mapNotNull null
          bundleOf(
            "packageName" to pkg,
            "label" to resolve.loadLabel(pm).toString()
          )
        }
        .distinctBy { it.getString("packageName") }
        .sortedBy { it.getString("label")?.lowercase() }
    }

    Function("setWatchedPackages") { packages: List<String> ->
      val context = appContext.reactContext ?: return@Function null
      WatchedStore.save(context, packages.toSet())
      null
    }
  }

  fun emitNotification(payload: Bundle) {
    sendEvent("NotificationReceived", payload)
  }
}
