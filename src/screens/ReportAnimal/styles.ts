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

  shareIcon: {
    width: 20,
    height: 27,
  },
  downloadIcon:{
    width: 20,
    height: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 30,
    marginBottom: 20,
    color: "#222",
  },

  table: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 10,
  },

  row: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#E3E3E3",
},

label: {
  flex: 1,
  fontSize: 13,
  color: "#666",
},

value: {
  flex: 1,
  fontSize: 14,
  fontWeight: "bold",
  textAlign: "center",
},

status: {
  flex: 1,
  fontSize: 13,
  textAlign: "right",
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

  downloadText: {
    color: "#FFF",
    fontWeight: "600",
  },
});