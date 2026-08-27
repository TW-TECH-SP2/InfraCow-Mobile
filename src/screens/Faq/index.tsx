import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import styles from "./styles";
import Navbar from "../../components/Navbar";
import { useNavigation } from "@react-navigation/native";

export default function FaqScreen() {
  const navigation = useNavigation<any>();

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData = [
    {
      question: "Posso ter até quantas fazendas?",
      answer:
        "Você pode cadastrar quantas fazendas desejar, sem limites definidos.",
    },
    {
      question: "Posso ter até quantos animais?",
      answer:
        "Você pode cadastrar quantos animais desejar dentro da sua fazenda, sem limites definidos.",
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../../assets/back-dark.png")}
            style={styles.backIcon}
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          FAQ - Perguntas {"\n"}Frequentes
        </Text>

        {faqData.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <View key={index} style={styles.item}>
              <TouchableOpacity
                style={styles.questionRow}
                onPress={() => toggleItem(index)}
              >
                <Text style={styles.question}>{item.question}</Text>

                <Image
                  source={
                    isOpen
                      ? require("../../../assets/arrow-up-dark.png")
                      : require("../../../assets/arrow-down-dark.png")
                  }
                  style={styles.icon}
                />
              </TouchableOpacity>

              {isOpen && (
                <Text style={styles.answer}>{item.answer}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Navbar />
    </View>
  );
}