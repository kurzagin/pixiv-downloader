const { withMainActivity } = require('@expo/config-plugins');

const withShareIntentHandler = (config) => {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    // Check if imports already added
    if (!contents.includes('import android.content.Intent')) {
      contents = contents.replace(
        'import android.os.Bundle',
        'import android.content.Intent\nimport android.net.Uri\nimport android.os.Bundle'
      );
    }

    // Add handleShareIntent and overrides
    const helperMethod = `
  override fun onNewIntent(intent: Intent) {
    handleShareIntent(intent)
    super.onNewIntent(intent)
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.action
    val type = intent.type

    if (Intent.ACTION_SEND == action && type != null && type.startsWith("text/")) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrBlank()) {
        val pixivRegex = Regex("https?://[^\\\\s]*pixiv\\\\.net/[^\\\\s]+")
        val match = pixivRegex.find(sharedText)
        val targetUri = if (match != null) {
          Uri.parse(match.value)
        } else {
          val idRegex = Regex("\\\\b\\\\d{6,11}\\\\b")
          val idMatch = idRegex.find(sharedText)
          if (idMatch != null) {
            Uri.parse("https://www.pixiv.net/artworks/\${idMatch.value}")
          } else null
        }

        if (targetUri != null) {
          intent.action = Intent.ACTION_VIEW
          intent.data = targetUri
        }
      }
    }
  }
`;

    if (!contents.includes('fun handleShareIntent')) {
      contents = contents.replace(
        'super.onCreate(null)',
        'handleShareIntent(intent)\n    super.onCreate(null)'
      );

      const lastBraceIndex = contents.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        contents = contents.slice(0, lastBraceIndex) + helperMethod + '\n}\n';
      }
    } else {
      // Replace existing handleShareIntent block
      const startIdx = contents.indexOf('override fun onNewIntent(intent: Intent)');
      if (startIdx !== -1) {
        contents = contents.slice(0, startIdx) + helperMethod.trim() + '\n}\n';
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withShareIntentHandler;
