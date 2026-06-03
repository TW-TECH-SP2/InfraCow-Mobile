## ⚙️ Como rodar o projeto

### 📌 Pré-requisitos

Antes de começar, você precisa ter instalado:

* **Node.js** (recomendado versão LTS)
* **npm** ou yarn
* **Expo CLI** (`npm install -g expo-cli`)
* **EAS CLI** (`npm install -g eas-cli`) - para builds nativos
* **Java JDK** (versão 11 ou superior) - para build de APK
* **Android SDK** - para emular Android

---

### 📦 Instalação de dependências

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/seu-repo.git

# Entrar na pasta
cd seu-repo

# Instalar todas as dependências (npm install é suficiente)
npm install
```

> ✅ O `npm install` instala automaticamente todas as dependências, incluindo os módulos nativos do React Native.

---

### 🔐 Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```
API_URL=http://localhost:3000
```

---

### 📱 Executando o app

Este projeto utiliza módulos nativos avançados (como animações otimizadas, gestos e componentes de data picker) que requerem uma build nativa completa. Por isso, oferecemos **duas opções de execução**:

---

#### **Opção 1: Executar via Web (Recomendado para desenvolvimento)**

```bash
# Inicie o servidor Expo
npx expo start
```

Na interface que aparecer, pressione:
- **`w`** para abrir a versão **web no navegador** (localhost)
- A aplicação abrirá em `http://localhost:19006` (ou similar)

**Vantagens:**
- Recarregamento instantâneo (hot reload)
- Desenvolvimento rápido e iterativo
- Acessa via navegador em qualquer dispositivo

---

#### **Opção 2: Build de APK (Para testes nativos completos)**

Se precisar testar funcionalidades específicas do Android ou preparar para distribuição:

```bash
# Fazer build do APK via EAS
eas build -p android --profile preview

# Aguarde a conclusão (pode levar alguns minutos)
# O APK será salvo no seu perfil EAS
```

Após a build:
1. Baixe o APK gerado
2. Transfira para seu dispositivo Android
3. Abra o arquivo `.apk` e instale

**Por que não usar o Expo Go?**

O Expo Go é uma ferramenta de desenvolvimento rápida, mas não suporta alguns módulos nativos avançados que este projeto utiliza:
- `react-native-reanimated` (animações performáticas)
- `react-native-gesture-handler` (detecção avançada de gestos)
- `react-native-datetimepicker` (data picker nativo)

Para compatibilidade total com essas dependências, é necessário fazer uma build nativa completa.

---

### 📋 Dependências principais

Este projeto utiliza:

* **React Native** (via Expo SDK 55)
* **React Navigation** - navegação robusta
* **Axios** - requisições HTTP
* **NetInfo** - detecção de conexão
* **React Native Reanimated** - animações de alta performance
* **React Native Gesture Handler** - gestos avançados
* **Expo Image Picker** - seleção de imagens
* **React Native Chart Kit** - gráficos de dados
* **React DOM** - suporte para web

---

### 🎯 Resumo dos comandos

| Comando | Descrição |
|---------|-----------|
| `npm install` | Instala todas as dependências |
| `npx expo start` | Inicia o servidor (pressione `w` para web) |
| `eas build -p android --profile preview` | Gera APK para teste |
| `eas build -p android --profile production` | Gera APK para produção |
