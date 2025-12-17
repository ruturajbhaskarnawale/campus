import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import client from '../../../core/api/client';

export default function CommentsScreen({ route }) {
  const { postId } = route.params || {};
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => { fetchComments(); }, []);

  const fetchComments = async () => {
    try {
      const res = await client.get(`/feed/${postId}/comments`);
      setComments(res.data || []);
    } catch (e) { console.error(e); Alert.alert('Error', 'Could not load comments'); }
  };

  const postComment = async () => {
    if (!text) return;
    try {
      await client.post(`/feed/${postId}/comments`, { text, author_name: 'Me' });
      setText('');
      fetchComments();
    } catch (e) { console.error(e); Alert.alert('Error', 'Could not post comment'); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comments</Text>

      <FlatList data={comments} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={styles.comment}>
          <Text style={styles.author}>{item.author_name}</Text>
          <Text>{item.text}</Text>
        </View>
      )} />

      <TextInput placeholder="Write a comment..." value={text} onChangeText={setText} style={styles.input} />
      <TouchableOpacity style={styles.button} onPress={postComment}><Text style={styles.buttonText}>Send</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  comment: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  author: { fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginTop: 12 },
  button: { backgroundColor: '#0a7ea4', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: '700' }
});
