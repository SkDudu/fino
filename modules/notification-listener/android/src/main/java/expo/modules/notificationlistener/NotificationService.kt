package expo.modules.notificationlistener

import android.app.Notification
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.os.bundleOf

class NotificationService : NotificationListenerService() {
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val watched = WatchedStore.load(this)
    if (watched.isEmpty() || sbn.packageName !in watched) return

    val extras = sbn.notification?.extras ?: return

    val appName = try {
      val info = packageManager.getApplicationInfo(sbn.packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      sbn.packageName
    }

    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()

    val payload = bundleOf(
      "id" to "${sbn.packageName}:${sbn.id}:${sbn.postTime}",
      "packageName" to sbn.packageName,
      "appName" to appName,
      "title" to title,
      "text" to text,
      "subText" to subText,
      "timestamp" to sbn.postTime
    )

    PendingStore.enqueue(this, payload)

    // ponytail: companion bridge; SharedFlow/channel if multiple RN hosts appear
    mainHandler.post {
      NotificationListenerModule.instance?.emitNotification(payload)
    }
  }
}
