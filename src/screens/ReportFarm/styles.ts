import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    padding: 20,
  },

  header: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  close: {
    fontSize: 28,
    color: "#222",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 20,
    color: "#222",
  },

  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  summaryItem: {
  backgroundColor: "#FFF",
  padding: 12,
  borderRadius: 12,
  alignItems: "center",
  flex: 1,              
  marginHorizontal: 4,  
},

  summaryLabel: {
  fontSize: 12,
  color: "#777",
  textAlign: "center",
  flexWrap: "wrap", 
},

  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E2415",
  },

  table: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 10,
  },

  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },

  info: {
    fontSize: 14,
    color: "#494949",
    marginTop: 2,
  },

    downloadBtn: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    backgroundColor: "#4D5C52",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 20,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

shareIcon: {
    width: 20,
    height: 27,
  },
  downloadIcon: {
    width: 18,
    height: 18,
  },

  downloadText: {
    color: "#FFF",
    fontWeight: "600",
  },
});