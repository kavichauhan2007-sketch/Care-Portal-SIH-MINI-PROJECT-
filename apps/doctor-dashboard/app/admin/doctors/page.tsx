'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Shield, UserCheck, UserX } from 'lucide-react';

interface Doctor {
  id: string;
  role: string;
  full_name: string;
  contact_number: string | null;
  department: string | null;
  specialization: string | null;
  license_number: string | null;
  active: boolean;
  email?: string;
  created_at: string;
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    email: '',
    password: '',
    full_name: '',
    contact_number: '',
    department: '',
    specialization: '',
    license_number: '',
    role: 'doctor' as 'doctor' | 'nurse' | 'admin',
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      // Get all user profiles with doctor/admin roles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['doctor', 'nurse', 'admin', 'system_admin'])
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Get corresponding auth users to get emails
      const userIds = profiles?.map(p => p.id) || [];
      
      // Merge data
      const doctorsData = profiles?.map(profile => ({
        ...profile,
        email: `${profile.full_name.toLowerCase().replace(/\s+/g, '.')}@careportal.health`, // Placeholder
      })) || [];

      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDoctor = async () => {
    if (!newDoctor.email || !newDoctor.password || !newDoctor.full_name) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create auth user using Supabase Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newDoctor.email,
        password: newDoctor.password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Step 2: Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          role: newDoctor.role,
          full_name: newDoctor.full_name,
          contact_number: newDoctor.contact_number,
          department: newDoctor.department,
          specialization: newDoctor.specialization,
          license_number: newDoctor.license_number,
          active: true,
        });

      if (profileError) throw profileError;

      alert('Doctor created successfully!');
      setShowCreateModal(false);
      setNewDoctor({
        email: '',
        password: '',
        full_name: '',
        contact_number: '',
        department: '',
        specialization: '',
        license_number: '',
        role: 'doctor',
      });
      loadDoctors();
    } catch (error: any) {
      console.error('Error creating doctor:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleDoctorStatus = async (doctorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ active: !currentStatus })
        .eq('id', doctorId);

      if (error) throw error;

      loadDoctors();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteDoctor = async (doctorId: string) => {
    if (!confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete user profile (auth user will remain)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;

      alert('Doctor deleted successfully');
      loadDoctors();
    } catch (error: any) {
      console.error('Error deleting doctor:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Doctor Management
            </h1>
            <p className="text-gray-600 mt-2">Manage doctor and staff credentials</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create New Doctor
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Doctors</p>
            <p className="text-3xl font-bold text-gray-900">{doctors.filter(d => d.role === 'doctor').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Active</p>
            <p className="text-3xl font-bold text-green-600">{doctors.filter(d => d.active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Inactive</p>
            <p className="text-3xl font-bold text-red-600">{doctors.filter(d => !d.active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Administrators</p>
            <p className="text-3xl font-bold text-blue-600">{doctors.filter(d => d.role.includes('admin')).length}</p>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name & Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  License
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doctor.full_name}</div>
                      <div className="text-sm text-gray-500">{doctor.email}</div>
                      <div className="text-xs text-gray-400">{doctor.contact_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      doctor.role === 'system_admin' ? 'bg-purple-100 text-purple-800' :
                      doctor.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      doctor.role === 'doctor' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doctor.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doctor.department || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {doctor.specialization || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doctor.license_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doctor.active ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <UserCheck className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <UserX className="h-4 w-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleDoctorStatus(doctor.id, doctor.active)}
                        className={`p-2 rounded hover:bg-gray-100 ${
                          doctor.active ? 'text-yellow-600' : 'text-green-600'
                        }`}
                        title={doctor.active ? 'Deactivate' : 'Activate'}
                      >
                        {doctor.active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                      </button>
                      {doctor.role !== 'system_admin' && (
                        <button
                          onClick={() => deleteDoctor(doctor.id)}
                          className="p-2 rounded hover:bg-gray-100 text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Doctor Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Create New Doctor Account</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="doctor@careportal.health"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Password *</label>
                  <input
                    type="password"
                    value={newDoctor.password}
                    onChange={(e) => setNewDoctor({ ...newDoctor, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newDoctor.full_name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, full_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Dr. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contact Number</label>
                  <input
                    type="tel"
                    value={newDoctor.contact_number}
                    onChange={(e) => setNewDoctor({ ...newDoctor, contact_number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <select
                    value={newDoctor.role}
                    onChange={(e) => setNewDoctor({ ...newDoctor, role: e.target.value as any })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={newDoctor.department}
                    onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="General Medicine"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Specialization</label>
                  <input
                    type="text"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="MD Internal Medicine"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">License Number</label>
                  <input
                    type="text"
                    value={newDoctor.license_number}
                    onChange={(e) => setNewDoctor({ ...newDoctor, license_number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="MCI-12345"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={createDoctor}
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Doctor'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
