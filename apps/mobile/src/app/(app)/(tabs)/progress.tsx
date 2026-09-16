import { Text } from 'react-native';
import { Screen, Title, uiStyles } from '@/components/ui';

export default function ProgressScreen() {
  return (
    <Screen>
      <Title>Progreso</Title>
      <Text style={uiStyles.muted}>Disponible en una próxima fase.</Text>
    </Screen>
  );
}
