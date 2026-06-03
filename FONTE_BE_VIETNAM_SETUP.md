# ✅ Be Vietnam Pro Font - Configuração Universal

## O Que Foi Feito

A fonte **Be Vietnam Pro** foi configurada como padrão em todo o projeto.

### Arquivo Principal
- `src/components/Text.tsx` — Componente customizado que encapsula o Text nativo com fontFamily Be Vietnam

### Screens Atualizados (18 screens)
Todos agora usam o componente `Text` customizado:
- ✅ Notifications
- ✅ Home
- ✅ Herd
- ✅ Animal
- ✅ Profile
- ✅ Auth
- ✅ Login
- ✅ Register
- ✅ EditUser
- ✅ EditFarm
- ✅ EditAnimal
- ✅ RegisterFarm
- ✅ RegisterAnimal
- ✅ MeasureForm
- ✅ Position
- ✅ PositionRfid
- ✅ Tutorials
- ✅ IdentifiedAnimal

## Como Usar

### ❌ ERRADO (não use mais)
```tsx
import { Text } from "react-native";

<Text>Meu texto</Text>
```

### ✅ CORRETO
```tsx
import Text from "../../components/Text";

// Padrão (regular)
<Text>Meu texto padrão</Text>

// Com variação de peso
<Text variant="bold">Texto em negrito</Text>
<Text variant="semibold">Texto semi-negrito</Text>
<Text variant="medium">Texto médio</Text>
<Text variant="regular">Texto regular</Text>

// Com estilos customizados
<Text style={{ fontSize: 16, color: "#333" }}>Texto customizado</Text>
```

## Variantes Disponíveis
- `regular` — peso normal (padrão)
- `medium` — peso médio
- `semibold` — peso semi-negrito
- `bold` — peso negrito

## Nota
Nenhum `fontFamily` adicional precisa ser adicionado manualmente - o componente `Text` já aplica Be Vietnam Pro automaticamente.

Se precisar de Text nativo do React Native (raro), use:
```tsx
import { Text as RNText } from "react-native";
<RNText>Texto nativo</RNText>
```
