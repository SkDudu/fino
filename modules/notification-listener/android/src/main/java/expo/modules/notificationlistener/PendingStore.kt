package expo.modules.notificationlistener

import android.content.Context
import android.os.Bundle
import org.json.JSONObject

object PendingStore {
  private const val PREFS_NAME = "fino_pending"

  fun enqueue(context: Context, payload: Bundle) {
    val id = payload.getString("id") ?: return
    val json = JSONObject()
    json.put("id", id)
    json.put("packageName", payload.getString("packageName", ""))
    json.put("appName", payload.getString("appName", ""))
    json.put("title", payload.getString("title", ""))
    json.put("text", payload.getString("text", ""))
    if (payload.containsKey("subText")) {
      json.put("subText", payload.getString("subText"))
    }
    json.put("timestamp", payload.getLong("timestamp"))
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(id, json.toString())
      .apply()
  }

  fun drain(context: Context): List<Bundle> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val all = prefs.all ?: return emptyList()
    val result = mutableListOf<Bundle>()
    for ((_, value) in all) {
      if (value !is String) continue
      try {
        val json = JSONObject(value)
        val bundle = Bundle().apply {
          putString("id", json.optString("id", ""))
          putString("packageName", json.optString("packageName", ""))
          putString("appName", json.optString("appName", ""))
          putString("title", json.optString("title", ""))
          putString("text", json.optString("text", ""))
          if (json.has("subText") && !json.isNull("subText")) {
            putString("subText", json.optString("subText"))
          }
          putLong("timestamp", json.optLong("timestamp", 0L))
        }
        result.add(bundle)
      } catch (_: Exception) {
        continue
      }
    }
    prefs.edit().clear().commit()
    return result
  }
}
