import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";

const API = "http://192.168.1.66:5000";

type Supplier = {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  phone_number: string;
  email: string;
  address: string;
};

const SupplierListMobile = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // Supplier form state
  const [supplierData, setSupplierData] = useState({
    supplier_name: "",
    contact_person: "",
    phone_number: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const filtered = suppliers.filter(
      (supplier) =>
        supplier.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
        supplier.phone_number?.toLowerCase().includes(search.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(search.toLowerCase()),
    );
    setFilteredSuppliers(filtered);
  }, [search, suppliers]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Change line 30-31 in fetchSuppliers function:
      const response = await axios.get<Supplier[]>(`${API}/suppliers`);
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      setError("Failed to load suppliers. Please try again.");
      Alert.alert("Error", "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddSupplierModal = () => {
    resetSupplierForm();
    setIsEditing(false);
    setSelectedSupplier(null);
    setModalVisible(true);
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setSupplierData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person,
      phone_number: supplier.phone_number,
      email: supplier.email,
      address: supplier.address || "",
    });
    setIsEditing(true);
    setSelectedSupplier(supplier);
    setModalVisible(true);
  };

  const resetSupplierForm = () => {
    setSupplierData({
      supplier_name: "",
      contact_person: "",
      phone_number: "",
      email: "",
      address: "",
    });
  };

  const handleSaveSupplier = async () => {
    if (!supplierData.supplier_name.trim()) {
      Alert.alert("Error", "Supplier name is required.");
      return;
    }

    try {
      if (isEditing && selectedSupplier) {
        // Update existing supplier
        await axios.put(
          `${API}/update-supplier/${selectedSupplier.supplier_id}`,
          supplierData,
        );
        Alert.alert("Success", "Supplier updated successfully!");
      } else {
        // Add new supplier
        await axios.post(`${API}/add-supplier`, supplierData);
        Alert.alert("Success", "Supplier added successfully!");
      }

      fetchSuppliers();
      setModalVisible(false);
      resetSupplierForm();
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to save supplier.";
      Alert.alert("Error", message);
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this supplier?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API}/suppliers/${supplierId}`);
              Alert.alert("Success", "Supplier deleted successfully!");
              fetchSuppliers();
            } catch (error) {
              Alert.alert("Error", "Failed to delete supplier");
            }
          },
        },
      ],
    );
  };

  const renderSupplierCard = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openEditSupplierModal(item)}
    >
      <View style={styles.cardHeader}>
        <Icon name="account-box-outline" size={24} color="#0B1446" />
        <View style={styles.cardTitleContainer}>
          <Text style={styles.supplierName} numberOfLines={1}>
            {item.supplier_name}
          </Text>
          <Text style={styles.supplierId}>ID: {item.supplier_id}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Icon name="account-outline" size={16} color="#666" />
        <Text style={styles.detailText} numberOfLines={1}>
          {item.contact_person || "N/A"}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="phone-outline" size={16} color="#666" />
        <Text style={styles.detailText}>{item.phone_number}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="email-outline" size={16} color="#666" />
        <Text style={styles.detailText} numberOfLines={1}>
          {item.email || "N/A"}
        </Text>
      </View>

      {item.address && (
        <View style={styles.detailRow}>
          <Icon name="map-marker-outline" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditSupplierModal(item)}
        >
          <Icon name="pencil-outline" size={16} color="#0B1446" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.viewProductsButton]}
          // Temporarily use Alert or console.log while you set up the route
          onPress={() =>
            router.push({
              pathname: "/supplier_products/[id]",
              params: { id: item.supplier_id.toString() },
            })
          }
        >
          <Icon name="package-variant" size={16} color="#fff" />
          <Text style={[styles.actionButtonText, { color: "#fff" }]}>
            Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSupplier(item.supplier_id)}
        >
          <Icon name="delete-outline" size={16} color="#F44336" />
          <Text style={[styles.actionButtonText, { color: "#F44336" }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSupplierModal = () => (
    <Modal visible={modalVisible} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Icon name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditing ? "Edit Supplier" : "Add Supplier"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          <TextInput
            placeholder="Supplier Name *"
            value={supplierData.supplier_name}
            onChangeText={(text) =>
              setSupplierData({ ...supplierData, supplier_name: text })
            }
            style={styles.input}
          />
          <TextInput
            placeholder="Contact Person"
            value={supplierData.contact_person}
            onChangeText={(text) =>
              setSupplierData({ ...supplierData, contact_person: text })
            }
            style={styles.input}
          />
          <TextInput
            placeholder="Phone Number"
            value={supplierData.phone_number}
            onChangeText={(text) =>
              setSupplierData({ ...supplierData, phone_number: text })
            }
            style={styles.input}
            keyboardType="phone-pad"
          />
          <TextInput
            placeholder="Email"
            value={supplierData.email}
            onChangeText={(text) =>
              setSupplierData({ ...supplierData, email: text })
            }
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Address"
            value={supplierData.address}
            onChangeText={(text) =>
              setSupplierData({ ...supplierData, address: text })
            }
            style={[styles.input, styles.textArea]}
            multiline
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveSupplier}
          >
            <Text style={styles.saveButtonText}>
              {isEditing ? "Update Supplier" : "Add Supplier"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#0B1446" />
        </TouchableOpacity>
        <Text style={styles.title}>Suppliers</Text>
        <TouchableOpacity
          onPress={openAddSupplierModal}
          style={styles.addButton}
        >
          <Icon name="plus-circle" size={24} color="#0B1446" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          placeholder="Search suppliers..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          placeholderTextColor="#999"
        />
      </View>

      {/* Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B1446" />
          <Text style={styles.loadingText}>Loading suppliers...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSuppliers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Supplier List */
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.supplier_id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={renderSupplierCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-question-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No suppliers found</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openAddSupplierModal}
              >
                <Text style={styles.emptyButtonText}>Add First Supplier</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Supplier Modal */}
      {renderSupplierModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0B1446", // Orders theme color
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchIcon: {
    marginRight: 8,
    color: "#666", // Orders theme color
  },
  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    color: "#F44336", // Orders voided status color
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0B1446", // Orders theme color
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  supplierName: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#0B1446", // Orders theme color
  },
  supplierId: {
    fontSize: 12,
    color: "#666", // Orders secondary text color
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666", // Orders secondary text color
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0B1446", // Orders theme color
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#0B1446", // Orders theme color
    fontWeight: "500",
  },
  viewProductsButton: {
    backgroundColor: "#0B1446", // Orders theme color
    borderColor: "#0B1446", // Orders theme color
  },
  deleteButton: {
    borderColor: "#F44336", // Orders voided status color
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    color: "#666", // Orders secondary text color
    fontSize: 16,
  },
  emptyButton: {
    backgroundColor: "#0B1446", // Orders theme color
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333", // Orders modal title color
  },
  formContainer: {
    padding: 16,
  },
  input: {
    backgroundColor: "#f5f5f5", // Orders input background
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd", // Orders border color
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#0B1446", // Orders theme color
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SupplierListMobile;
