import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AiAssistantEngine } from '../engines/aiAssistantEngine';
import NetInfo from '@react-native-community/netinfo';

const AiAssistantScreen = () => {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState([
        { id: '1', text: t('ai.greeting', 'Namaste! I am AgriSahayak. How can I help your farm today?'), sender: 'bot' }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const flatListRef = useRef();

    const quickActions = AiAssistantEngine.getQuickActions(i18n.language);

    // Monitor network status
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected && state.isInternetReachable);
        });
        return () => unsubscribe();
    }, []);

    const sendMessage = async (text = inputText, isSystemCmd = false) => {
        if (!text.trim()) return;

        const newMsg = { id: Date.now().toString(), text: isSystemCmd ? '📷 Image Uploaded' : text, sender: 'user', image: isSystemCmd ? 'leaf_mock' : null };
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        setLoading(true);

        try {
            const response = await AiAssistantEngine.ask(text, i18n.language);
            const botMsg = { id: (Date.now() + 1).toString(), text: response, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };

    const handleVoice = () => {
        setStatusText('Listening...');
        setTimeout(() => {
            setInputText('voice_cmd_soil'); // Mock voice input
            sendMessage('voice_cmd_soil');
        }, 1500);
    };

    const handleCamera = () => {
        Alert.alert(
            "Select Image",
            "Choose a photo of your crop to analyze.",
            [
                { text: "Camera", onPress: () => simulateImageAnalysis() },
                { text: "Gallery", onPress: () => simulateImageAnalysis() },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const simulateImageAnalysis = () => {
        setStatusText('Analyzing Image...');
        setTimeout(() => {
            sendMessage('analyzing_image_cmd', true);
        }, 2000);
    };

    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const renderMessage = ({ item }) => (
        <View style={[styles.msgContainer, item.sender === 'user' ? styles.msgUser : styles.msgBot]}>
            {item.sender === 'bot' && (
                <View style={styles.botIcon}>
                    <Image source={require('../../assets/illustrations/mascot.png')} style={styles.botAvatar} resizeMode="contain" />
                </View>
            )}
            <View style={[styles.msgBubble, item.sender === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                {item.text.includes('📷') && (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="image" size={40} color="#ccc" />
                    </View>
                )}
                <Text style={[styles.msgText, item.sender === 'user' ? styles.textUser : styles.textBot]}>{item.text}</Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text style={styles.title}>AgriSahayak AI</Text>
                <View style={[styles.onlineBadge, !isOnline && styles.offlineBadge]}>
                    <View style={[styles.dot, !isOnline && styles.dotOffline]} />
                    <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            {(loading || statusText) && (
                <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color="#2e7d32" />
                    <Text style={styles.typingText}>{statusText || 'AgriSahayak is thinking...'}</Text>
                </View>
            )}

            <View style={styles.quickActions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {quickActions.map(action => (
                        <TouchableOpacity
                            key={action.id}
                            style={styles.actionChip}
                            onPress={() => sendMessage(action.query)}
                        >
                            <Text style={styles.actionText}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.mediaBtn} onPress={handleCamera}>
                    <Ionicons name="camera" size={24} color="#555" />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask AgriSahayak..."
                    placeholderTextColor="#999"
                    onSubmitEditing={() => sendMessage()}
                />
                {inputText ? (
                    <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.sendBtn, styles.micBtn]} onPress={handleVoice}>
                        <Ionicons name="mic" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        paddingTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    offlineBadge: {
        backgroundColor: 'rgba(158, 158, 158, 0.2)',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4caf50',
        marginRight: 6,
    },
    dotOffline: {
        backgroundColor: '#9e9e9e',
    },
    onlineText: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    list: {
        padding: 15,
        paddingBottom: 20,
    },
    msgContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        alignItems: 'flex-end',
    },
    msgUser: {
        justifyContent: 'flex-end',
    },
    msgBot: {
        justifyContent: 'flex-start',
    },
    botIcon: {
        width: 40,
        height: 40,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    botAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f1f8e9',
    },
    msgBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18,
    },
    bubbleUser: {
        backgroundColor: '#2e7d32',
        borderBottomRightRadius: 4,
    },
    bubbleBot: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    msgText: {
        fontSize: 16,
        lineHeight: 22,
    },
    textUser: {
        color: '#fff',
    },
    textBot: {
        color: '#333',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    typingText: {
        marginLeft: 8,
        color: '#666',
        fontSize: 14,
        fontStyle: 'italic',
    },
    quickActions: {
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    actionChip: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#2e7d32',
    },
    actionText: {
        color: '#2e7d32',
        fontWeight: '600',
    },
    inputArea: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 10,
        color: '#333',
        marginLeft: 10,
    },
    sendBtn: {
        width: 45,
        height: 45,
        borderRadius: 25,
        backgroundColor: '#2e7d32',
        justifyContent: 'center',
        alignItems: 'center',
    },
    micBtn: {
        backgroundColor: '#f57c00',
    },
    mediaBtn: {
        padding: 10,
    },
    imagePlaceholder: {
        width: 150,
        height: 100,
        backgroundColor: '#eee',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    }
});

export default AiAssistantScreen;
