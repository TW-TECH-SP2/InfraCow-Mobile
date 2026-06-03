import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    padding: 20,
  },

  backIcon: {
    width: 30,
    height: 30,
    marginTop: 20,
    marginBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#3A3125",
    marginBottom: 20,
  },

  item: {
    marginBottom: 15,
  },

  questionRow: {
  flexDirection: "row",
  alignItems: "center",
},
  question: {
  fontSize: 16,
  fontWeight: "600",
  color: "#3A3125",
  flex: 1,
},

  icon: {
    width: 20,
    height: 10,
    marginRight: 10, 
  },

  answer: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
});