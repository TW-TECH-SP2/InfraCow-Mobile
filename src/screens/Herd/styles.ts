import { StyleSheet, Dimensions, } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },

  headerImage: {
    height: 290,
    padding: 20,
    justifyContent: "space-between",
    width,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    overflow: "hidden",
  },

  headerImageRadius: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    overflow: "hidden",
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  backIcon: {
    width: 40,
    height: 40,
    marginTop: 15,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2E2415",
    marginTop: -70,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },

  search: {
    flex: 1,
    backgroundColor: "#EAEAEA",
    borderRadius: 15,
    height: 50,
    borderColor: "#C3C3C3",
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  searchActive: {
    flex: 1,
  },

  searchIcon: {
    width: 21,
    height: 21,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 0,
  },

  addButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#282113",
    justifyContent: "center",
    alignItems: "center",
  },

  addIcon: {
    width: 20,
    height: 20,
    tintColor: "#fff",
  },
  card: {
    marginTop: 10,
    marginRight: 15,
  },

  cardImage: {
    width: 150,
    height: 150,
    justifyContent: "flex-start",
    padding: 10,
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  sectionTitle: {
  fontSize: 18,
  fontWeight: "700",
  marginLeft: 20,
  marginTop: 20,
  marginBottom: 10,
  color: "#2E2415",
},

dotsButton: {
  position: "absolute",
  top: 10,
  right: 10,
  width: 28,
  height: 28,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(210, 210, 210, 0.59)",
  borderRadius: 100,
},

dotsIcon: {
  width: 3,
  height: 16,
},

menu: {
  position: "absolute",
  top: 40,
  left: 0,
  right: 0,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  padding: 6,
  elevation: 5,
},

menuBtn: {
  width: 50,
  height: 50,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(210, 210, 210, 0.59)",
  borderRadius: 20,
},

menuIcon: {
  width: 30, 
  height: 30,

},

});