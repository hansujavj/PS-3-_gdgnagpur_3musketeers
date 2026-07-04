import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="alert-circle" size={60} color="#d32f2f" />
                    </View>
                    <Text style={styles.title}>Oops! Something went wrong</Text>
                    <Text style={styles.message}>
                        AgriChain encountered an unexpected error. Don't worry, your data is safe.
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                        <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                    {__DEV__ && this.state.error && (
                        <View style={styles.errorDetails}>
                            <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                        </View>
                    )}
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 30,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#2e7d32',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorDetails: {
        marginTop: 30,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    errorText: {
        fontSize: 12,
        color: '#d32f2f',
        fontFamily: 'monospace',
    }
});

export default ErrorBoundary;
