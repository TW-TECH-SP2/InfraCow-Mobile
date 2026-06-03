import { StyleSheet, Dimensions } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    },

    title: {
    fontSize: width * 0.08,
    fontWeight: "600",
    color: "#282113",
    alignSelf: "flex-start", 
    marginBottom: 20,
    },

    content: {
    flex: 1,
    justifyContent: "center", 
    alignItems: "center",    
    },

  circleContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 100,
  },

  circle: {
    width: width * 0.6, 
    height: width * 0.6,
    resizeMode: "contain",
  },

  overlay: {
    position: "absolute", 
    justifyContent: "center",
    alignItems: "center",
  },

  measureText: {
    fontSize: width * 0.07,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#282113",
    width: "80%",
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
  },
  retryContainer: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 15,
},

retryIcon: {
  width: 18,
  height: 18,
  marginRight: 6,
  resizeMode: "contain",
},

retryText: {
  color: "#3B2F1B",
  fontSize: 14,
  fontWeight: "500",
},
});