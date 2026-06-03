import { Dimensions, StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");


export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    padding: 16,
  },

  title: {
    fontSize: width * 0.07, 
    fontWeight: "bold",
    color: "#282113",
    marginTop: 60,
    marginBottom: 20,
  },

  card: {
    padding: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#E3E3E3",
    minHeight: 140,
  },

  date: {
    fontSize: 12,
    color: "#000",
    marginBottom: 6,
    fontWeight: "500",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10,
  },

  textContainer: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 2,
  },

  message: {
    fontSize: 14,
    color: "#000",
  },

checkContainer: {
  justifyContent: "center",
  alignItems: "center",
  width: 80,
  backgroundColor: "#4D5C52",

  alignSelf: "stretch",
  minHeight: 140, 
},

  check: {
    width: 30,
    height: 30,
  },
});