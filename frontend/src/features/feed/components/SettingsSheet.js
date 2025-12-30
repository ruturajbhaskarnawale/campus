
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../../core/design/Theme';

export default function SettingsSheet({ visible, onClose, settings, onUpdate }) {
    if (!visible) return null;

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={{flex: 1}} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.title}>Post Settings</Text>

                    {/* Section: Visibility */}
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.label}>Visibility</Text>
                            <Text style={styles.subLabel}>Who can see this project?</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.pillBtn}
                            onPress={() => onUpdate('visibility', settings.visibility === 'public' ? 'connections' : 'public')}
                        >
                            <Ionicons name={settings.visibility === 'public' ? "globe-outline" : "people-outline"} size={16} color={COLORS.primary} style={{marginRight: 6}} />
                            <Text style={styles.pillText}>{settings.visibility === 'public' ? 'Everyone' : 'Connections'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Section: Schedule */}
                    <View style={styles.row}>
                         <View>
                            <Text style={styles.label}>Schedule Post</Text>
                            <Text style={styles.subLabel}>Publish at a later time</Text>
                        </View>
                        <Switch 
                            value={settings.isScheduled} 
                            onValueChange={(val) => onUpdate('isScheduled', val)}
                            trackColor={{true: COLORS.primary}} 
                        />
                    </View>
                    {settings.isScheduled && (
                        <TextInput 
                            style={styles.timeInput}
                            placeholder="YYYY-MM-DD HH:MM" 
                            placeholderTextColor="#999"
                            value={settings.scheduledTime} 
                            onChangeText={(val) => onUpdate('scheduledTime', val)} 
                        />
                    )}

                    {/* Section: Skills */}
                    <View style={{marginTop: 20}}>
                        <Text style={styles.label}>Skills Needed</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. React, UX Design, Python" 
                            value={settings.skills} 
                            onChangeText={(val) => onUpdate('skills', val)} 
                        />
                    </View>

                    {/* Section: Polls */}
                    <View style={styles.row}>
                         <View>
                            <Text style={styles.label}>Add a Poll</Text>
                        </View>
                        <Switch 
                            value={settings.showPoll} 
                            onValueChange={(val) => onUpdate('showPoll', val)}
                            trackColor={{true: COLORS.primary}} 
                        />
                     </View>
                     
                     {settings.showPoll && (
                         <View style={styles.pollArea}>
                             <TextInput style={styles.pollInput} placeholder="Option 1" placeholderTextColor="#999" onChangeText={(t) => onUpdate('pollOption1', t)} />
                             <TextInput style={styles.pollInput} placeholder="Option 2" placeholderTextColor="#999" onChangeText={(t) => onUpdate('pollOption2', t)} />
                         </View>
                     )}

                    <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { 
        backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: {width: 0, height: -5},
        minHeight: 400
    },
    handle: { width: 40, height: 5, backgroundColor: '#eee', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 25 },
    
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#000' },
    subLabel: { fontSize: 12, color: '#888', marginTop: 4 },
    
    pillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    pillText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    
    input: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginTop: 10, fontSize: 15 },
    timeInput: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginBottom: 15, color: COLORS.primary },
    
    pollArea: { marginBottom: 20 },
    pollInput: { borderBottomWidth: 1, borderBottomColor: '#eee', padding: 10, marginBottom: 10 },
    
    doneBtn: { backgroundColor: '#000', padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    doneText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
