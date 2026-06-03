import { StyleSheet, Dimensions } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F2F2F2",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },

  title: {
    fontSize: width * 0.07, 
    fontWeight: "bold",
    color: "#282113",
  },

  logo: {
    width: width * 0.14,
    height: width * 0.06,
    resizeMode: "contain",
  },

  button: {
    backgroundColor: "#2E2415",
    padding: 15,
    borderRadius: 20,
    marginVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.04,
  },

  plus: {
    width: width * 0.06,
    height: width * 0.06,
    marginRight: 8,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 10,
    marginBottom: 15,
    elevation: 3,
    alignItems: "center",
  },

  cardImage: {
  width: "55%",
  height: "100%",   
  aspectRatio: 1,    
  borderRadius: 15,
  resizeMode: "cover",
},

  cardContent: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "space-between",
  },

  cardTitle: {
    fontWeight: "600",
    fontSize: width * 0.04,
  },

  cardText: {
    fontSize: width * 0.032,
    color: "#666",
  },

  cardCity: {
    fontSize: width * 0.032,
    fontWeight: "600",
    marginTop: 5,
  },

  cardButton: {
    backgroundColor: "#2E2415",
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },

  cardButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width * 0.035,
  },
});