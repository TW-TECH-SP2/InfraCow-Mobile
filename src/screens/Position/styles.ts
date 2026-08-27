import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
  },

  text: {
    position: "absolute",
    top: height * 0.07,
    color: "#FFFFFF",
    fontSize: width * 0.050,
    textAlign: "center",
    fontWeight: "500",
  },

  eyeImage: {
    position: "absolute",
    width: width * 0.80,
    height: width * 0.80,
    top: "50%",
    left: "50%",
    transform: [
      { translateX: -(width * 0.40) },
      { translateY: -(width * 0.40) },
    ],
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: "#45391F",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  permissionText: {
    color: "#FFFFFF",
    fontSize: width * 0.05,
    textAlign: "center",
    marginBottom: 25,
  },

  permissionButton: {
    color: "#FFFFFF",
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
});