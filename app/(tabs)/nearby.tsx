import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MessageCircle, MapPin, Clock } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// 20 Mock travelers with real avatar URLs
const TRAVELERS = [
  {
    id: '1',
    name: 'Emma',
    age: 28,
    country: 'USA',
    flag: '🇺🇸',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    bio: 'Digital nomad exploring Portugal for 3 months',
    activity: 'Looking for coffee buddies',
    x: 45,
    y: 35,
    lastActive: '2 min ago',
  },
  {
    id: '2',
    name: 'Lucas',
    age: 31,
    country: 'Brazil',
    flag: '🇧🇷',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    bio: 'Surfer & photographer based in Lisbon',
    activity: 'Heading to the beach',
    x: 62,
    y: 52,
    lastActive: '5 min ago',
  },
  {
    id: '3',
    name: 'Yuki',
    age: 26,
    country: 'Japan',
    flag: '🇯🇵',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    bio: 'Architecture student on exchange',
    activity: 'Exploring Alfama',
    x: 78,
    y: 40,
    lastActive: 'Just now',
  },
  {
    id: '4',
    name: 'Marco',
    age: 34,
    country: 'Italy',
    flag: '🇮🇹',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    bio: 'Chef looking for local food spots',
    activity: 'Wine tasting',
    x: 25,
    y: 45,
    lastActive: '8 min ago',
  },
  {
    id: '5',
    name: 'Sophie',
    age: 29,
    country: 'France',
    flag: '🇫🇷',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    bio: 'Art curator visiting galleries',
    activity: 'Museum hopping',
    x: 55,
    y: 28,
    lastActive: '12 min ago',
  },
  {
    id: '6',
    name: 'James',
    age: 27,
    country: 'UK',
    flag: '🇬🇧',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    bio: 'Remote developer, love hiking',
    activity: 'Working from a café',
    x: 38,
    y: 58,
    lastActive: '3 min ago',
  },
  {
    id: '7',
    name: 'Anna',
    age: 25,
    country: 'Germany',
    flag: '🇩🇪',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    bio: 'Yoga instructor traveling Europe',
    activity: 'Morning yoga session',
    x: 72,
    y: 65,
    lastActive: '15 min ago',
  },
  {
    id: '8',
    name: 'Carlos',
    age: 30,
    country: 'Spain',
    flag: '🇪🇸',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    bio: 'Musician playing in local bars',
    activity: 'Jam session tonight',
    x: 15,
    y: 35,
    lastActive: '20 min ago',
  },
  {
    id: '9',
    name: 'Lisa',
    age: 32,
    country: 'Netherlands',
    flag: '🇳🇱',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    bio: 'Travel blogger & content creator',
    activity: 'Shooting content in Belém',
    x: 20,
    y: 55,
    lastActive: '1 min ago',
  },
  {
    id: '10',
    name: 'Alex',
    age: 28,
    country: 'Australia',
    flag: '🇦🇺',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face',
    bio: 'Gap year adventure seeker',
    activity: 'Sunset at Miradouro',
    x: 85,
    y: 30,
    lastActive: '7 min ago',
  },
  {
    id: '11',
    name: 'Maria',
    age: 26,
    country: 'Mexico',
    flag: '🇲🇽',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    bio: 'Graphic designer & foodie',
    activity: 'Trying pastéis de nata',
    x: 50,
    y: 72,
    lastActive: '4 min ago',
  },
  {
    id: '12',
    name: 'Tom',
    age: 35,
    country: 'Canada',
    flag: '🇨🇦',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face',
    bio: 'Tech entrepreneur exploring startups',
    activity: 'Networking event',
    x: 30,
    y: 25,
    lastActive: '10 min ago',
  },
  {
    id: '13',
    name: 'Nina',
    age: 24,
    country: 'Sweden',
    flag: '🇸🇪',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face',
    bio: 'Fashion student on summer break',
    activity: 'Vintage shopping in Príncipe Real',
    x: 65,
    y: 18,
    lastActive: '6 min ago',
  },
  {
    id: '14',
    name: 'Pedro',
    age: 29,
    country: 'Argentina',
    flag: '🇦🇷',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop&crop=face',
    bio: 'Football fan & backpacker',
    activity: 'Watching the game',
    x: 88,
    y: 55,
    lastActive: '25 min ago',
  },
  {
    id: '15',
    name: 'Kim',
    age: 27,
    country: 'South Korea',
    flag: '🇰🇷',
    avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face',
    bio: 'K-beauty entrepreneur',
    activity: 'Rooftop bar hopping',
    x: 42,
    y: 48,
    lastActive: '9 min ago',
  },

  {
    id: '17',
    name: 'Olivia',
    age: 30,
    country: 'New Zealand',
    flag: '🇳🇿',
    avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150&h=150&fit=crop&crop=face',
    bio: 'Marine biologist on sabbatical',
    activity: 'Oceanarium visit',
    x: 58,
    y: 85,
    lastActive: '14 min ago',
  },
  {
    id: '18',
    name: 'Viktor',
    age: 28,
    country: 'Ukraine',
    flag: '🇺🇦',
    avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=150&h=150&fit=crop&crop=face',
    bio: 'Software engineer & gamer',
    activity: 'Co-working space',
    x: 12,
    y: 68,
    lastActive: '18 min ago',
  },
  {
    id: '19',
    name: 'Sara',
    age: 31,
    country: 'Denmark',
    flag: '🇩🇰',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face',
    bio: 'Sustainability consultant',
    activity: 'Eco-friendly shopping',
    x: 35,
    y: 15,
    lastActive: '22 min ago',
  },
  {
    id: '20',
    name: 'Ahmed',
    age: 29,
    country: 'Egypt',
    flag: '🇪🇬',
    avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
    bio: 'History buff & tour guide',
    activity: 'Exploring Castelo de São Jorge',
    x: 82,
    y: 42,
    lastActive: '5 min ago',
  },
];

// Mapbox static image of Lisbon (dark mode)
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZnJhbmNpc2FsYnUiLCJhIjoiY21oM2J1OGc4MGFtYjJqc2I2eDhndzUwNyJ9.nRQbFabhYCo2_YrLIePjpg';
const MAP_IMAGE_URL = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-9.1393,38.7223,13,0/800x600@2x?access_token=${MAPBOX_TOKEN}`;

interface Traveler {
  id: string;
  name: string;
  age: number;
  country: string;
  flag: string;
  avatar: string;
  bio: string;
  activity: string;
  x: number;
  y: number;
  lastActive: string;
}

export default function NearbyScreen() {
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openProfile = (traveler: Traveler) => {
    setSelectedTraveler(traveler);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTraveler(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Full Screen Map Container */}
      <View style={styles.mapContainer}>
        <Image
          source={{ uri: MAP_IMAGE_URL }}
          style={styles.mapImage}
          resizeMode="cover"
        />
        
        {/* Gradient overlay for header readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']}
          style={styles.headerGradient}
        />
        
        {/* Header overlaid on map */}
        <SafeAreaView style={styles.headerOverlay}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nearby Travelers</Text>
            <View style={styles.headerBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.headerSubtitle}>{TRAVELERS.length} active now</Text>
            </View>
          </View>
        </SafeAreaView>
        
        {/* Overlay markers - positioned in marker area */}
        <View style={styles.markersArea}>
          {TRAVELERS.map((traveler) => (
            <TouchableOpacity
              key={traveler.id}
              style={[
                styles.markerContainer,
                {
                  left: `${traveler.x}%`,
                  top: `${traveler.y}%`,
                },
              ]}
              onPress={() => openProfile(traveler)}
              activeOpacity={0.8}
            >
              <View style={styles.markerPulse} />
              <Image
                source={{ uri: traveler.avatar }}
                style={styles.markerAvatar}
              />
              <View style={styles.flagBadge}>
                <Text style={styles.flagText}>{traveler.flag}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active Now Section */}
      <View style={styles.activeSection}>
        <Text style={styles.activeSectionTitle}>Active Now</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeScrollContent}
        >
          {TRAVELERS.slice(0, 10).map((traveler) => (
            <TouchableOpacity
              key={traveler.id}
              style={styles.activeCard}
              onPress={() => openProfile(traveler)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#CFFF04', '#FFE600']}
                style={styles.activeCardGradient}
              >
                <Image
                  source={{ uri: traveler.avatar }}
                  style={styles.activeAvatar}
                />
                <View style={styles.activeOnlineDot} />
              </LinearGradient>
              <Text style={styles.activeName}>{traveler.name}</Text>
              <Text style={styles.activeFlag}>{traveler.flag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTraveler && (
              <>
                <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <Image
                  source={{ uri: selectedTraveler.avatar }}
                  style={styles.modalAvatar}
                />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalName}>
                    {selectedTraveler.name}, {selectedTraveler.age}
                  </Text>
                  <Text style={styles.modalCountry}>
                    {selectedTraveler.flag} {selectedTraveler.country}
                  </Text>
                </View>

                <View style={styles.modalInfo}>
                  <View style={styles.infoRow}>
                    <Clock size={16} color="#999999" />
                    <Text style={styles.infoText}>{selectedTraveler.lastActive}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={16} color="#999999" />
                    <Text style={styles.infoText}>Lisbon, Portugal</Text>
                  </View>
                </View>

                <Text style={styles.modalBio}>{selectedTraveler.bio}</Text>

                <View style={styles.activityBadge}>
                  <Text style={styles.activityText}>📍 {selectedTraveler.activity}</Text>
                </View>

                <TouchableOpacity style={styles.connectButton}>
                  <LinearGradient
                    colors={['#CFFF04', '#FFE600']}
                    style={styles.connectGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MessageCircle size={20} color="#000" />
                    <Text style={styles.connectText}>Say Hello</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CFFF04',
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999999',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#141414',
  },
  markersArea: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  markerPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(207, 255, 4, 0.3)',
  },
  markerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#CFFF04',
  },
  flagBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  flagText: {
    fontSize: 12,
  },
  activeSection: {
    backgroundColor: '#0A0A0A',
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  activeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 20,
    marginBottom: 12,
  },
  activeScrollContent: {
    paddingHorizontal: 16,
  },
  activeCard: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  activeCardGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
  },
  activeOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CFFF04',
    borderWidth: 2,
    borderColor: '#000',
  },
  activeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 6,
  },
  activeFlag: {
    fontSize: 14,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: 'center',
    minHeight: height * 0.55,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  modalAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#CFFF04',
    marginTop: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginTop: 16,
  },
  modalName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCountry: {
    fontSize: 16,
    color: '#999999',
    marginTop: 4,
  },
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#999999',
  },
  modalBio: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  activityBadge: {
    backgroundColor: 'rgba(207, 255, 4, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  activityText: {
    fontSize: 14,
    color: '#CFFF04',
    fontWeight: '500',
  },
  connectButton: {
    marginTop: 24,
    width: '100%',
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  connectText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});
