import React from "react";
import { View, Pressable, Image, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import styles from "./styles";

type Tab = "home" | "tutorials" | "measure" | "profile" | "notifications";

type Props = {
  active: Tab;
};

export default function Navbar({ active }: Props) {
  const navigation = useNavigation<any>();

  const Container = (
    <View
      style={[
        styles.container,
        Platform.OS === "android" && styles.androidGlass
      ]}
    >
      <Pressable onPress={() => navigation.navigate("Home")}>
        <Image
          source={
            active === "home"
              ? require("../../../assets/home-active.png")
              : require("../../../assets/home.png")
          }
          style={styles.icon}
        />
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Tutorials")}>
        <Image
          source={
            active === "tutorials"
              ? require("../../../assets/tutorials-active.png")
              : require("../../../assets/tutorials.png")
          }
          style={styles.icon}
        />
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Measure")}>
        <Image
          source={
            active === "measure"
              ? require("../../../assets/measure-active.png")
              : require("../../../assets/measure.png")
          }
          style={styles.icon}
        />
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Profile")}>
        <Image
          source={
            active === "profile"
              ? require("../../../assets/profile-active.png")
              : require("../../../assets/profile.png")
          }
          style={styles.icon}
        />
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Notifications")}>
        <Image
          source={
            active === "notifications"
              ? require("../../../assets/notifications-active.png")
              : require("../../../assets/notifications.png")
          }
          style={styles.icon}
        />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={50} tint="light" style={styles.container}>
          {Container.props.children}
        </BlurView>
      ) : (
        Container
      )}
    </View>
  );
}