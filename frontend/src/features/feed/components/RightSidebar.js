import React from 'react';
import { View, StyleSheet } from 'react-native';
import PeopleYouMayKnow from './PeopleYouMayKnow'; // Reuse logic but adapt style usually, but for now reuse
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../../core/design/Theme';
import { Text } from 'react-native';

export default function RightSidebar() {
    return (
        <View style={styles.container}>
            {/* Recommendation Widgets */}
            <View style={styles.section}>
                <PeopleYouMayKnow vertical={true} /> 
                {/* We might need to update PYMK to support vertical mode */}
            </View>
            
            <View style={styles.section}>
                 <Text style={styles.header}>Trending Topics</Text>
                 <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8}}>
                     {['#React', '#AI', '#Hackathon', '#Internships'].map(t => (
                         <Text key={t} style={styles.topic}>{t}</Text>
                     ))}
                 </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerLink}>About</Text>
                <Text style={styles.footerLink}>Help Center</Text>
                <Text style={styles.footerLink}>Privacy & Terms</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    section: {
        backgroundColor: COLORS.background.card,
        borderRadius: RADIUS.m,
        ...SHADOWS.light,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: '#eee',
    },
    header: { fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
    topic: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
    footer: { padding: SPACING.m, alignItems: 'center' },
    footerLink: { fontSize: 11, color: COLORS.text.tertiary, marginBottom: 4 }
});
