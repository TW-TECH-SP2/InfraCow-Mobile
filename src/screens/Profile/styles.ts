import { StyleSheet, Dimensions } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },

  header: {
    height: 280,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  darkOverlay: {
  ...StyleSheet.absoluteFill,
  backgroundColor: "rgba(0,0,0,0.35)", 
},

  overlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 90,
  },

  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  emailLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  email: {
    fontSize: 14,
    color: "#FFFFFF",
  },

  editButton: {
    position: "absolute",

    top: 250, 
    right: 20,

    backgroundColor: "#FFFFFF",
    width: 60,
    height: 60,
    borderRadius: 30,

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    },

  editIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },

  content: {
    padding: 20,
    marginTop: 30,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#282113",
  },

  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 15,
  },

  helpIcon: {
    width: 16.62,
    height: 19.64,
    marginRight: 10,
  },

  helpText: {
    flex: 1,
    fontSize: 14,
    color: "#555",
  },

  arrow: {
    width: 27.88,
    height: 27.88,
    resizeMode: "contain",
  },
});