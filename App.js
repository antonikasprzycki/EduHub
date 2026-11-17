import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, TextInput, Modal, SafeAreaView, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {}
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [folders, setFolders] = useState(['Główne']);
  const [currentFolder, setCurrentFolder] = useState('Główne');
  const [platforms, setPlatforms] = useState([]);
  const [activePlatform, setActivePlatform] = useState(null);
  
  // Stan ukrywania paska w aktywnej platformie
  const [hideWebViewHeader, setHideWebViewHeader] = useState(false);

  const [modalFolderVisible, setModalFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [modalProfileVisible, setModalProfileVisible] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Stan edycji nazwy platformy
  const [modalEditPlatformVisible, setModalEditPlatformVisible] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [editedPlatformTitle, setEditedPlatformTitle] = useState('');

  const [confirmDialog, setConfirmDialog] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (currentProfile) {
      loadData();
      loadFolders();
    }
  }, [currentProfile, currentFolder]);

  const openConfirm = (title, message, onConfirmAction) => {
    setConfirmDialog({
      visible: true,
      title,
      message,
      onConfirm: async () => {
        await onConfirmAction();
        setConfirmDialog({ visible: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const closeConfirm = () => {
    setConfirmDialog({ visible: false, title: '', message: '', onConfirm: null });
  };

  const loadProfiles = async () => {
    try {
      const savedProfiles = await AsyncStorage.getItem('app_profiles');
      if (savedProfiles) {
        const parsed = JSON.parse(savedProfiles);
        setProfiles(parsed);
        if (parsed.length > 0 && !currentProfile) {
          setCurrentProfile(parsed[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfiles = async (updatedProfiles) => {
    try {
      setProfiles(updatedProfiles);
      await AsyncStorage.setItem('app_profiles', JSON.stringify(updatedProfiles));
    } catch (e) {
      console.error(e);
    }
  };

  const addProfile = async () => {
    const trimmed = newProfileName.trim();
    if (trimmed && !profiles.includes(trimmed)) {
      const updated = [...profiles, trimmed];
      await saveProfiles(updated);
      setCurrentProfile(trimmed);
      setNewProfileName('');
      setModalProfileVisible(false);
    }
  };

  const requestDeleteProfile = (profileName) => {
    setModalProfileVisible(false);
    setTimeout(() => {
      openConfirm(
        'Usuń profil',
        `Czy na pewno chcesz trwale usunąć profil "${profileName}" oraz wszystkie przypisane do niego foldery i platformy?`,
        async () => {
          const updatedProfiles = profiles.filter(p => p !== profileName);
          await saveProfiles(updatedProfiles);
          await AsyncStorage.removeItem(`platforms_${profileName}`);
          await AsyncStorage.removeItem(`folders_${profileName}`);

          if (currentProfile === profileName) {
            if (updatedProfiles.length > 0) {
              setCurrentProfile(updatedProfiles[0]);
            } else {
              setCurrentProfile(null);
              setPlatforms([]);
              setFolders(['Główne']);
              setCurrentFolder('Główne');
            }
          }
        }
      );
    }, 150);
  };

  const loadFolders = async () => {
    try {
      const savedFolders = await AsyncStorage.getItem(`folders_${currentProfile}`);
      if (savedFolders) {
        const parsed = JSON.parse(savedFolders);
        setFolders(parsed);
        if (!parsed.includes(currentFolder)) {
          setCurrentFolder(parsed[0] || 'Główne');
        }
      } else {
        setFolders(['Główne']);
        setCurrentFolder('Główne');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveFolders = async (updatedFolders) => {
    try {
      setFolders(updatedFolders);
      await AsyncStorage.setItem(`folders_${currentProfile}`, JSON.stringify(updatedFolders));
    } catch (e) {
      console.error(e);
    }
  };

  const addFolder = async () => {
    const trimmed = newFolderName.trim();
    if (trimmed && !folders.includes(trimmed)) {
      const updated = [...folders, trimmed];
      await saveFolders(updated);
      setCurrentFolder(trimmed);
      setNewFolderName('');
      setModalFolderVisible(false);
    }
  };

  const requestDeleteFolder = (folderName) => {
    if (folders.length <= 1) {
      openConfirm(
        'Nie można usunąć',
        'Aplikacja musi posiadać przynajmniej jeden aktywny folder.',
        () => {}
      );
      return;
    }

    openConfirm(
      'Usuń folder',
      `Czy na pewno chcesz usunąć folder "${folderName}" oraz wszystkie znajdujące się w nim platformy?`,
      async () => {
        const updatedFolders = folders.filter(f => f !== folderName);
        await saveFolders(updatedFolders);
        const updatedPlatforms = platforms.filter(p => p.folder !== folderName);
        await saveData(updatedPlatforms);
        if (currentFolder === folderName) {
          setCurrentFolder(updatedFolders[0]);
        }
      }
    );
  };

  const loadData = async () => {
    try {
      const savedPlatforms = await AsyncStorage.getItem(`platforms_${currentProfile}`);
      if (savedPlatforms) {
        setPlatforms(JSON.parse(savedPlatforms));
      } else {
        setPlatforms([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveData = async (updatedPlatforms) => {
    try {
      setPlatforms(updatedPlatforms);
      await AsyncStorage.setItem(`platforms_${currentProfile}`, JSON.stringify(updatedPlatforms));
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
          progress: '0%'
        };
        await saveData([...platforms, newPlatform]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestDeletePlatform = (platform) => {
    openConfirm(
      'Usuń platformę',
      `Czy na pewno chcesz usunąć platformę "${platform.title}" z tego folderu?`,
      async () => {
        const updatedPlatforms = platforms.filter(p => p.id !== platform.id);
        await saveData(updatedPlatforms);
      }
    );
  };

  const openEditPlatformModal = (platform) => {
    setEditingPlatform(platform);
    setEditedPlatformTitle(platform.title);
    setModalEditPlatformVisible(true);
  };

  const saveEditedPlatformTitle = async () => {
    const trimmed = editedPlatformTitle.trim();
    if (trimmed && editingPlatform) {
      const updated = platforms.map(p => p.id === editingPlatform.id ? { ...p, title: trimmed } : p);
      await saveData(updated);
      setModalEditPlatformVisible(false);
      setEditingPlatform(null);
    }
  };

  // Skrypt wstrzykiwany do WebView wykrywający scrollowanie w górę (gdy strona jest na samej górze i użytkownik próbuje scrollować wyżej)
  const injectedScrollDetectionJS = `
    let lastY = window.scrollY;
    window.addEventListener('scroll', function() {
      let currentY = window.scrollY;
      if (currentY <= 0 && lastY > 0) {
        window.ReactNativeWebView.postMessage("SHOW_HEADER");
      }
      lastY = currentY;
    });
    true;
  `;

  if (activePlatform) {
    return (
      <SafeAreaView style={styles.containerDark}>
        {!hideWebViewHeader && (
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => setActivePlatform(null)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Powrót</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{activePlatform.title}</Text>
            <TouchableOpacity onPress={() => setHideWebViewHeader(true)} style={styles.toggleHeaderBtn}>
              <Text style={styles.toggleHeaderText}>👁️ Schowaj</Text>
            </TouchableOpacity>
          </View>
        )}

        {WebView ? (
          <WebView 
            source={{ uri: activePlatform.uri }} 
            style={styles.webview}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            allowFileAccessFromFileURLs={true}
            mixedContentMode="always"
            originWhitelist={['*']}
            injectedJavaScript={injectedScrollDetectionJS}
            onMessage={(event) => {
              if (event.nativeEvent.data === "SHOW_HEADER") {
                setHideWebViewHeader(false);
              }
            }}
          />
        ) : (
          <View style={styles.noProfileContainer}>
            <Text style={styles.noProfileText}>Podgląd WebView niedostępny w tej przeglądarce.</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (!currentProfile) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <View style={styles.noProfileContainer}>
          <Text style={styles.noProfileTitle}>EduHub Manager</Text>
          <Text style={styles.noProfileText}>Utwórz swój pierwszy profil, aby rozpocząć.</Text>
          <View style={styles.firstProfileBox}>
            <TextInput
              style={styles.input}
              placeholder="Wpisz nazwę profilu..."
              placeholderTextColor="#888"
              value={newProfileName}
              onChangeText={setNewProfileName}
            />
            <TouchableOpacity style={styles.modalBtnConfirmFull} onPress={addProfile}>
              <Text style={styles.modalBtnText}>Utwórz profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.containerDark}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.profileButton} onPress={() => setModalProfileVisible(true)}>
          <Text style={styles.profileText}>👤 {currentProfile}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.folderAddButton} onPress={() => setModalFolderVisible(true)}>
          <Text style={styles.folderAddText}>+ Nowy Folder</Text>
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderScroll}>
          {folders.map(folder => (
            <TouchableOpacity
              key={folder}
              style={[styles.folderTab, currentFolder === folder && styles.folderTabActive]}
              onPress={() => setCurrentFolder(folder)}
              onLongPress={() => requestDeleteFolder(folder)}
              delayLongPress={400}
            >
              <Text style={[styles.folderTabText, currentFolder === folder && styles.folderTabTextActive]}>
                📁 {folder}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.hintText}>Przytrzymaj folder dłużej, aby go usunąć</Text>
      </View>

      <View style={styles.contentArea}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Folder: {currentFolder}</Text>
          <TouchableOpacity style={styles.addButton} onPress={pickDocument}>
            <Text style={styles.addButtonText}>+ Dodaj plik</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={platforms.filter(p => p.folder === currentFolder)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.kafelek}
              onPress={() => { setHideWebViewHeader(false); setActivePlatform(item); }}
              onLongPress={() => requestDeletePlatform(item)}
              delayLongPress={400}
            >
              <View style={styles.kafelekInfo}>
                <Text style={styles.kafelekTitle}>{item.title}</Text>
                <Text style={styles.kafelekProgress}>Postęp: {item.progress}</Text>
              </View>
              <View style={styles.kafelekActions}>
                <TouchableOpacity
                  onPress={() => openEditPlatformModal(item)}
                  style={styles.platformEditBtn}
                >
                  <Text style={styles.platformEditText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => requestDeletePlatform(item)}
                  style={styles.platformDeleteBtn}
                >
                  <Text style={styles.platformDeleteText}>🗑️</Text>
                </TouchableOpacity>
                <Text style={styles.kafelekArrow}>▶</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Brak platform w tym folderze. Kliknij „+ Dodaj plik”, aby wgrać plik.</Text>
          }
        />
      </View>

      {/* Modal edycji nazwy platformy */}
      <Modal visible={modalEditPlatformVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edytuj nazwę platformy</Text>
            <TextInput
              style={styles.input}
              placeholder="Nowa nazwa..."
              placeholderTextColor="#888"
              value={editedPlatformTitle}
              onChangeText={setEditedPlatformTitle}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalEditPlatformVisible(false)}>
                <Text style={styles.modalBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={saveEditedPlatformTitle}>
                <Text style={styles.modalBtnText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalFolderVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nowy folder</Text>
            <TextInput
              style={styles.input}
              placeholder="Nazwa folderu..."
              placeholderTextColor="#888"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalFolderVisible(false)}>
                <Text style={styles.modalBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={addFolder}>
                <Text style={styles.modalBtnText}>Utwórz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalProfileVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profile użytkowników</Text>
            <ScrollView style={{ maxHeight: 180 }}>
              {profiles.map(p => (
                <View key={p} style={styles.profileRow}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 6 }}
                    onPress={() => {
                      setCurrentProfile(p);
                      setModalProfileVisible(false);
                    }}
                  >
                    <Text style={[styles.profileItemText, currentProfile === p && styles.profileItemActive]}>
                      👤 {p}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => requestDeleteProfile(p)}
                    style={styles.profileDeleteBtn}
                  >
                    <Text style={styles.profileDeleteText}>🗑️ Usuń</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, { marginTop: 15 }]}
              placeholder="Nazwa nowego profilu..."
              placeholderTextColor="#888"
              value={newProfileName}
              onChangeText={setNewProfileName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalProfileVisible(false)}>
                <Text style={styles.modalBtnText}>Zamknij</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={addProfile}>
                <Text style={styles.modalBtnText}>Dodaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmDialog.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.confirmTitle}>{confirmDialog.title}</Text>
            <Text style={styles.confirmMessage}>{confirmDialog.message}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={closeConfirm}>
                <Text style={styles.modalBtnText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDanger} onPress={confirmDialog.onConfirm}>
                <Text style={styles.modalBtnText}>Usuń</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerDark: { flex: 1, backgroundColor: '#121212', paddingTop: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  profileButton: { backgroundColor: '#1E1E1E', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  profileText: { color: '#FFF', fontWeight: 'bold' },
  folderAddButton: { backgroundColor: '#252525', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  folderAddText: { color: '#4CAF50', fontWeight: 'bold' },
  folderScroll: { paddingHorizontal: 16, maxHeight: 42 },
  folderTab: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, backgroundColor: '#1E1E1E', borderRadius: 20, borderWidth: 1, borderColor: '#2E2E2E', justifyContent: 'center' },
  folderTabActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  folderTabText: { color: '#AAA', fontSize: 14 },
  folderTabTextActive: { color: '#FFF', fontWeight: 'bold' },
  hintText: { color: '#555', fontSize: 11, paddingHorizontal: 18, marginTop: 4, marginBottom: 12 },
  contentArea: { flex: 1, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  addButton: { backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addButtonText: { color: '#FFF', fontWeight: 'bold' },
  kafelek: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  kafelekInfo: { flex: 1, paddingRight: 10 },
  kafelekTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  kafelekProgress: { color: '#888', fontSize: 13 },
  kafelekActions: { flexDirection: 'row', alignItems: 'center' },
  platformEditBtn: { marginRight: 10, padding: 4 },
  platformEditText: { fontSize: 16 },
  platformDeleteBtn: { marginRight: 10, padding: 4 },
  platformDeleteText: { fontSize: 16 },
  kafelekArrow: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, lineHeight: 20 },
  headerBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1A1A1A', borderBottomWidth: 1, borderBottomColor: '#333' },
  backButton: { marginRight: 10 },
  backButtonText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 13 },
  headerTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', flex: 1 },
  toggleHeaderBtn: { backgroundColor: '#2A2A2A', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  toggleHeaderText: { color: '#AAA', fontSize: 12 },
  webview: { flex: 1, backgroundColor: '#121212' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1E1E1E', width: '85%', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  confirmTitle: { color: '#FF5252', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  confirmMessage: { color: '#DDD', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  input: { backgroundColor: '#2A2A2A', color: '#FFF', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#444' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: { backgroundColor: '#333', padding: 12, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' },
  modalBtnConfirm: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' },
  modalBtnConfirmFull: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnDanger: { backgroundColor: '#D32F2F', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  profileItemText: { color: '#AAA', fontSize: 16 },
  profileItemActive: { color: '#4CAF50', fontWeight: 'bold' },
  profileDeleteBtn: { backgroundColor: '#2A1A1A', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#522' },
  profileDeleteText: { color: '#FF5252', fontSize: 12, fontWeight: 'bold' },
  noProfileContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  noProfileTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  noProfileText: { color: '#888', fontSize: 15, marginBottom: 24, textAlign: 'center' },
  firstProfileBox: { width: '100%', backgroundColor: '#1E1E1E', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333' }
});
