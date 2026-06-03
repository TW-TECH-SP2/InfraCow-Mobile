import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end", 
    paddingBottom: 80,
    paddingHorizontal: 20,
  },

  background: {
    ...StyleSheet.absoluteFill,
    resizeMode: "cover",
  },

  content: {
    width: "100%",
    alignItems: "center",
  },

  logo: {
    width: 228,
    height: 136,
    marginBottom: 150, 
  },

  buttonPrimary: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    width: "70%",
    borderRadius: 20,
    marginBottom: 10,
    alignItems: "center",
  },

  buttonTextPrimary: {
    fontWeight: "600",
    fontSize: 18,
    color: "#282113",
  },

  buttonSecondary: {
    paddingVertical: 10,
    alignItems: "center",
    width: "100%",
  },

textWrapper: {
  fontSize: 16,
  color: "#FFFFFF",
  textAlign: "center",
  flexWrap: "wrap",
  width: "100%",
},

  link: {
    fontWeight: "500",
    color: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF",
    borderStyle: "dashed",
  },
});

export default styles;