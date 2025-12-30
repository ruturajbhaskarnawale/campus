import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import client from '../../../core/api/client';
import { getCurrentUserId } from '../../../core/auth';

export default function BookmarksScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [uid, setUid] = useState(null);

  useEffect(() => {
     // Resolve async UID first
     getCurrentUserId().then(id => setUid(id));
  }, []);

  useEffect(() => { if (uid) fetchBookmarks(); }, [uid]);

  const fetchBookmarks = async () => {
    try {
      if (!uid) return;
      const res = await client.get(`/feed/user/${uid}/bookmarks`);
      const list = res.data.data || [];
      
      // Backend returns { id, post_id, post: {...} }
      // We extract the post object directly
      const posts = list.map(b => b.post).filter(Boolean);
      setItems(posts);
    } catch (e) { console.error('fetch bookmarks', e); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookmarks</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { post: item })}>
            <Image source={{ uri: item.media_urls?.[0] || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23e0e0e0"/></svg>' }} style={styles.img} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{padding:12}}>No bookmarks yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1}, title:{fontSize:18,fontWeight:'700',padding:12}, img:{width:110,height:110,margin:4}
});
