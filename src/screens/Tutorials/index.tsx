import { View, Image, TouchableOpacity, FlatList } from "react-native";
import Text from "../../components/Text";
import { useState } from "react";
import styles from "./styles";
import Navbar from "../../components/Navbar";


const videos = [
  {
    id: "1",
    name: "Aula 01 - Cadastrando sua Fazenda",
    image: require("../../../assets/video.png"),
  },
  {
    id: "2",
    name: "Aula 02 - Cadastrando seu rebanho",
    image: require("../../../assets/video.png"),
  },
  {
    id: "3",
    name: "Aula 03 - Medir temperatura",
    image: require("../../../assets/video.png"),
  },
];



export default function TutorialScreen() {

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Tutorial
        </Text>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={styles.subtitle}>Aprenda a manusear nosso sistema por aqui!</Text>
      </View>

               <FlatList
                 data={videos}
                 keyExtractor={(item) => item.id}
                 contentContainerStyle={{ paddingBottom: 100 }}
                 renderItem={({ item }) => (
                    <View style={styles.videoCard}>

                        <View style={styles.imageWrapper}>

                        <Image source={item.image} style={styles.videoimage} />

                        <Text style={styles.videoTitle}>
                            {item.name}
                        </Text>

                        <TouchableOpacity style={styles.playButton}>
                            <Image
                            source={require("../../../assets/playvideo.png")}
                            style={styles.play}
                            />
                        </TouchableOpacity>

                        </View>

                    </View>
                    )}
               />

          <Navbar active="tutorials" />

    </View>
  );
}