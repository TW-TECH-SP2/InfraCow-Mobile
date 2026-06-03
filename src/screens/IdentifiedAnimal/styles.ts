import { StyleSheet, Dimensions } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3D674A", 
    justifyContent: "center",   
    alignItems: "center",       
    paddingHorizontal: 30,
  },

  icon: {
    width: width * 0.20,  
    height: width * 0.20,
    marginBottom: 20,
    resizeMode: "contain",
  },

  text: {
    color: "#FFFFFF",
    fontSize: width * 0.050,
    textAlign: "center",
    fontWeight: "500",
  },
});