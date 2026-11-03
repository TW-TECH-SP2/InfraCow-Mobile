import { View, Image, TouchableOpacity, FlatList, ActivityIndicator, Linking } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { WebView } from "react-native-webview";
import styles from "./styles";
import Navbar from "../../components/Navbar";

type TutorialVideo = {
  id: string;
  name: string;
  youtubeId?: string;
};

const videos: TutorialVideo[] = [
  {
    id: "1",
    name: "Aula 01 - Cadastro de usuario e Login",
    youtubeId: "d0M9iiGCCfE",
  },
  {
    id: "2",
    name: "Aula 02 - Cadastrando sua fazenda e animais",
    youtubeId: "9WmMy-jx1cM",
  },
  {
    id: "3",
    name: "Aula 03 - Medir temperatura",
    youtubeId: "KosaN4gu_qA",
  },
  {
    id: "4",
    name: "Aula 04 - Visualizando relatórios",
    youtubeId: "sR0RvXY6J28",
  },
];

const COVER = require("../../../assets/video.png");
const PLAY_ICON = require("../../../assets/playvideo.png");

const ALLOWED_URL =
  /^(about:|https:\/\/([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|google\.com|gstatic\.com|googlevideo\.com|ytimg\.com|doubleclick\.net))/i;

const youtubeEmbedHtml = (youtubeId: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </body>
</html>`;

type VideoCardProps = {
  item: TutorialVideo;
  playing: boolean;
  onPlay: (id: string | null) => void;
};

function VideoCard({ item, playing, onPlay }: VideoCardProps) {
  const [offline, setOffline] = useState(false);
  const youtubeId = item.youtubeId;

  const handlePlay = async () => {
    if (!youtubeId) return;


    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) {
      setOffline(true);
      return;
    }

    setOffline(false);
    onPlay(item.id);
  };

  return (
    <View style={styles.videoCard}>
      <View style={[styles.imageWrapper, playing && styles.imageWrapperPlaying]}>
        {playing && youtubeId ? (
          <>
            <WebView
              style={styles.webview}
              originWhitelist={["*"]}
              source={{ html: youtubeEmbedHtml(youtubeId), baseUrl: "https://www.youtube.com" }}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              onShouldStartLoadWithRequest={(request) => {
                if (ALLOWED_URL.test(request.url)) return true;
                Linking.openURL(request.url).catch(() => {});
                return false;
              }}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => onPlay(null)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Image source={COVER} style={styles.videoimage} />

            <Text style={styles.videoTitle}>{item.name}</Text>

            {youtubeId ? (
              <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                <Image source={PLAY_ICON} style={styles.play} />
              </TouchableOpacity>
            ) : (
              <View style={styles.comingSoon}>
                <Text style={styles.comingSoonText}>Em breve</Text>
              </View>
            )}

            {offline && (
              <View style={styles.offlineBox}>
                <Text style={styles.offlineText}>Sem internet. Conecte-se para assistir ao vídeo.</Text>
              </View>
            )}
          </>
        )}
      </View>

      {youtubeId && (
        <TouchableOpacity onPress={() => Linking.openURL(`https://www.youtube.com/shorts/${youtubeId}`).catch(() => {})}>
          <Text style={styles.openLink}>Abrir no YouTube</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TutorialScreen() {

  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tutorial</Text>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={styles.subtitle}>Aprenda a manusear nosso sistema por aqui!</Text>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        extraData={playingId}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <VideoCard item={item} playing={playingId === item.id} onPlay={setPlayingId} />
        )}
      />

      <Navbar active="tutorials" />
    </View>
  );
}