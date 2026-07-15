package expo.modules.notificationlistener

import android.content.Context

object WatchedStore {
  private const val PREFS_NAME = "fino_watched"
  private const val KEY_PACKAGES = "packages"

  fun load(context: Context): Set<String> {
    return context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getStringSet(KEY_PACKAGES, emptySet())
      ?: emptySet()
  }

  fun save(context: Context, packages: Set<String>) {
    context
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putStringSet(KEY_PACKAGES, packages)
      .apply()
  }
}
