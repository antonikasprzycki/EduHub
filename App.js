import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';

export default function App() {
  const [profiles, setProfiles] = useState(['Profil 1', 'Uczeń']);
  const [currentProfile, setCurrentProfile] = useState('Profil 1');
  const [folders, setFolders] = useState(['Główne', 'Przyroda', 'Inne']);
  const [currentFolder, setCurrentFolder] = useState('Główne');
  const [platforms, setPlatforms] = useState([]);
  const [activePlatform, setActivePlatform] = useState(null);

  // Stany modalne
  const [modalFolderVisible, setModalFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [modalProfileVisible, setModalProfileVisible] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    loadData();
  }, [currentProfile]);

  const loadData = async () => {
    try {
      const savedPlatforms = await AsyncStorage.getItem(
        `platforms_${currentProfile}`
      );
      if (savedPlatforms) setPlatforms(JSON.parse(savedPlatforms));
    } catch (e) {
      console.error(e);
    }
  };

  const saveData = async (newPlatforms) => {
    try {
      setPlatforms(newPlatforms);
      await AsyncStorage.setItem(
        `platforms_${currentProfile}`,
        JSON.stringify(newPlatforms)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const newPlatform = {
          id: Date.now().toString(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          uri: file.uri,
          folder: currentFolder,
          progress: '0%',
        };
        saveData([...platforms, newPlatform]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName)) {
      setFolders([...folders, newFolderName]);
      setNewFolderName('');
      setModalFolderVisible(false);
    }
  };

  const addProfile = () => {
    if (newProfileName.trim() && !profiles.includes(newProfileName)) {
      setProfiles([...profiles, newProfileName]);
      setCurrentProfile(newProfileName);
      setNewProfileName('');
      setModalProfileVisible(false);
    }
  };

  if (activePlatform) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => setActivePlatform(null)}
            style={styles.backButton}>
            <Text style={styles.backButtonText}>← Powrót do menu</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activePlatform.title}
          </Text>
        </View>
        <WebView source={{ uri: activePlatform.uri }} style={styles.webview} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.containerDark}>
      {/* Górny pasek profili i folderów */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setModalProfileVisible(true)}>
          <Text style={styles.profileText}>👤 {currentProfile}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.folderAddButton}
          onPress={() => setModalFolderVisible(true)}>
          <Text style={styles.folderAddText}>+ Nowy Folder</Text>
        </TouchableOpacity>
      </View>

      {/* Wybór folderu */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.folderScroll}>
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder}
            style={[
              styles.folderTab,
              currentFolder === folder && styles.folderTabActive,
            ]}
            onPress={() => setCurrentFolder(folder)}>
            <Text
              style={[
                styles.folderTabText,
                currentFolder === folder && styles.folderTabTextActive,
              ]}>
              📁 {folder}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista platform w kafelkach */}
      <View style={styles.contentArea}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Platformy w folderze: {currentFolder}
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={pickDocument}>
            <Text style={styles.addButtonText}>+ Dodaj plik</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={platforms.filter((p) => p.folder === currentFolder)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.kafelek}
              onPress={() => setActivePlatform(item)}>
              <View style={styles.kafelekInfo}>
                <Text style={styles.kafelekTitle}>{item.title}</Text>
                <Text style={styles.kafelekProgress}>
                  Postęp: {item.progress}
                </Text>
              </View>
              <Text style={styles.kafelekArrow}>▶</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Brak platform w tym folderze. Kliknij „+ Dodaj plik”, aby wgrać
              plik HTML/TXT.
            </Text>
          }
        />
      </View>

      {/* Modal dodawania folderu */}
      <Modal visible={modalFolderVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Utwórz nowy folder</Text>
            <TextInput
              style={styles.input}
              placeholder="Nazwa folderu..."
              placeholderTextColor="#888"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalFolderVisible(false)}>
                <Text style={styles.modalBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={addFolder}>
                <Text style={styles.modalBtnText}>Utwórz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal dodawania profilu */}
      <Modal visible={modalProfileVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Wybierz lub dodaj profil</Text>
            {profiles.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.profileItem}
                onPress={() => {
                  setCurrentProfile(p);
                  setModalProfileVisible(false);
                }}>
                <Text
                  style={[
                    styles.profileItemText,
                    currentProfile === p && styles.profileItemActive,
                  ]}>
                  👤 {p}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.input, { marginTop: 15 }]}
              placeholder="Nowy profil..."
              placeholderTextColor="#888"
              value={newProfileName}
              onChangeText={setNewProfileName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setModalProfileVisible(false)}>
                <Text style={styles.modalBtnText}>Zamknij</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={addProfile}>
                <Text style={styles.modalBtnText}>Dodaj profil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerDark: { flex: 1, backgroundColor: '#121212', paddingTop: 10 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  profileButton: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  profileText: { color: '#FFF', fontWeight: 'bold' },
  folderAddButton: {
    backgroundColor: '#2C2C2C',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  folderAddText: { color: '#4CAF50', fontWeight: 'bold' },
  folderScroll: { paddingHorizontal: 16, maxHeight: 50, marginBottom: 10 },
  folderTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    height: 38,
  },
  folderTabActive: { backgroundColor: '#4CAF50' },
  folderTabText: { color: '#AAA' },
  folderTabTextActive: { color: '#FFF', fontWeight: 'bold' },
  contentArea: { flex: 1, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: { color: '#FFF', fontWeight: 'bold' },
  kafelek: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  kafelekInfo: { flex: 1 },
  kafelekTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kafelekProgress: { color: '#888', fontSize: 13 },
  kafelekArrow: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: { marginRight: 15 },
  backButtonText: { color: '#4CAF50', fontWeight: 'bold' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  webview: { flex: 1, backgroundColor: '#121212' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '85%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2C2C2C',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalBtnConfirm: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' },
  profileItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  profileItemText: { color: '#AAA', fontSize: 16 },
  profileItemActive: { color: '#4CAF50', fontWeight: 'bold' },
});
