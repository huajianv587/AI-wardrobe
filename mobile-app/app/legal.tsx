import { router } from "expo-router";
import { Text } from "react-native";

import { Button, Card, Screen, SectionTitle, styles } from "@/components/ui";

export default function LegalScreen() {
  return (
    <Screen title="Privacy and Terms" subtitle="App Store review information and in-app policy access.">
      <Card>
        <SectionTitle title="Privacy policy" />
        <Text style={styles.body}>
          AI Wardrobe stores account, wardrobe, image, outfit, recommendation, and style profile data to provide the app functionality.
          The app does not include advertising or cross-app tracking in the first release.
        </Text>
      </Card>
      <Card>
        <SectionTitle title="Terms" />
        <Text style={styles.body}>
          Users are responsible for the clothing photos and style notes they add. AI recommendations are suggestions and may be edited or ignored.
        </Text>
      </Card>
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
