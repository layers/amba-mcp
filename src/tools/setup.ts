import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

const SDK_SNIPPETS: Record<string, string> = {
  ios: `// Swift — AppDelegate.swift or App init
import Amba

@main
struct MyApp: App {
    init() {
        Amba.configure(apiKey: "YOUR_CLIENT_API_KEY")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// Identify the user after login
Amba.identify(userId: "user_123", properties: [
    "email": "user@example.com",
    "plan": "premium"
])

// Track events
Amba.track("workout_completed", properties: [
    "duration_minutes": 30,
    "type": "strength"
])

// Register for push notifications
Amba.Push.requestPermission()

// In AppDelegate:
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Amba.Push.registerToken(deviceToken)
}

// Get remote config
let dailyLimit = Amba.Config.get("daily_limit", default: 10)

// Get current streak
let streak = try await Amba.Streaks.get("daily_login")
print("Current streak: \\(streak.currentCount)")`,

  android: `// Kotlin — Application class
import dev.amba.sdk.Amba

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Amba.configure(this, apiKey = "YOUR_CLIENT_API_KEY")
    }
}

// Identify the user after login
Amba.identify("user_123", mapOf(
    "email" to "user@example.com",
    "plan" to "premium"
))

// Track events
Amba.track("workout_completed", mapOf(
    "duration_minutes" to 30,
    "type" to "strength"
))

// Register for push notifications
Amba.Push.requestPermission(activity)

// Get remote config
val dailyLimit = Amba.Config.get("daily_limit", default = 10)

// Get current streak
val streak = Amba.Streaks.get("daily_login")
println("Current streak: \${streak.currentCount}")`,

  'react-native': `// Bare React Native — App.tsx
// Use @layers/amba-client directly. For Expo apps, prefer @layers/amba-expo.
import { Amba } from '@layers/amba-client';

// Configure once at app startup
Amba.configure({
  projectId: 'YOUR_PROJECT_ID',
  apiKey: 'YOUR_CLIENT_API_KEY',
});

// Initialise (restores session, fetches remote config)
await Amba.client.init();

// Track events
await Amba.client.track('workout_completed', {
  duration_minutes: 30,
  type: 'strength',
});

// Register a push token (obtained from your native push library, e.g. @react-native-firebase/messaging)
await Amba.client.push.registerToken(deviceToken, 'ios');

// Get remote config
const dailyLimit = Amba.client.config.get('daily_limit') ?? 10;

// Get current streaks
const streaks = await Amba.client.streaks.getAll();`,

  expo: `// Expo — app/_layout.tsx
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { Amba } from '@layers/amba-expo';

export default function RootLayout() {
  useEffect(() => {
    Amba.init({
      projectId: process.env.EXPO_PUBLIC_AMBA_PROJECT_ID!,
      apiKey: 'YOUR_CLIENT_API_KEY',
    });
  }, []);

  return <Slot />;
}

// In any component — no hook required, Amba is a singleton
import { Amba } from '@layers/amba-expo';

function HomeScreen() {
  const onComplete = async () => {
    await Amba.track('workout_completed', { type: 'strength' });
  };

  const onSignInApple = async () => {
    await Amba.signInWithApple();
  };

  return (
    <View>
      <Button title="Complete Workout" onPress={onComplete} />
      <Button title="Sign in with Apple" onPress={onSignInApple} />
    </View>
  );
}

// Push + deep links — add to app.json:
// {
//   "expo": {
//     "plugins": [
//       ["@layers/amba-expo", { "ios": { "pushNotifications": true } }]
//     ]
//   }
// }`,

  flutter: `// Flutter — main.dart
import 'package:amba_flutter/amba_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Amba.configure(apiKey: 'YOUR_CLIENT_API_KEY');
  runApp(const MyApp());
}

// Identify the user after login
await Amba.identify('user_123', properties: {
  'email': 'user@example.com',
  'plan': 'premium',
});

// Track events
await Amba.track('workout_completed', properties: {
  'duration_minutes': 30,
  'type': 'strength',
});

// Request push permission
await Amba.push.requestPermission();

// Get remote config
final dailyLimit = await Amba.config.get<int>('daily_limit', defaultValue: 10);

// Get current streak
final streak = await Amba.streaks.get('daily_login');
print('Current streak: \${streak.currentCount}');`,
};

// We use _apiClient parameter name to indicate it's unused but required by the interface
export function registerTools(server: McpServer, _apiClient: ApiClient): void {
  server.tool(
    'amba_get_sdk_setup_instructions',
    'Get platform-specific code snippets and setup instructions for integrating the Amba client SDK into a mobile app. Supports iOS (Swift), Android (Kotlin), React Native, Expo, and Flutter.',
    {
      platform: z
        .enum(['ios', 'android', 'react-native', 'expo', 'flutter'])
        .describe('The target platform for SDK integration instructions'),
    },
    async ({ platform }) => {
      const snippet = SDK_SNIPPETS[platform];
      if (!snippet) {
        return {
          content: [
            {
              type: 'text',
              text: `No setup instructions available for platform "${platform}". Supported platforms: ios, android, react-native, expo, flutter.`,
            },
          ],
        };
      }

      const instructions = [
        `# Amba SDK Setup — ${platform}`,
        '',
        '## Installation',
        '',
        ...(platform === 'ios'
          ? [
              '```',
              '// Swift Package Manager',
              '// Add: https://github.com/amba-dev/amba-ios.git',
              '```',
            ]
          : platform === 'android'
            ? ['```gradle', 'implementation("dev.amba:amba-android:latest")', '```']
            : platform === 'react-native'
              ? ['```bash', 'npm install @layers/amba-client', '```']
              : platform === 'expo'
                ? ['```bash', 'npx expo install @layers/amba-expo', '```']
                : ['```yaml', '# pubspec.yaml', 'dependencies:', '  amba_flutter: ^latest', '```']),
        '',
        '## Integration Code',
        '',
        '```' +
          (platform === 'ios'
            ? 'swift'
            : platform === 'android'
              ? 'kotlin'
              : platform === 'flutter'
                ? 'dart'
                : 'typescript'),
        snippet,
        '```',
        '',
        '## Next Steps',
        '',
        "1. Replace YOUR_CLIENT_API_KEY with your project's client API key (find it with amba_get_project)",
        '2. Configure push notification integration (APNs for iOS, FCM for Android) using amba_configure_integration',
        '3. Create segments to target user groups with amba_create_segment',
        '4. Set up remote config values with amba_set_config',
        '5. Create streaks to track user engagement with amba_create_streak',
      ].join('\n');

      return { content: [{ type: 'text', text: instructions }] };
    },
  );
}
