<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class OrganizationController extends Controller
{
    /**
     * Display a listing of organizations for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $organizations = $user->organizations()
            ->with('creator')
            ->withCount('users')
            ->paginate(15);

        return Inertia::render('Organizations/Index', [
            'organizations' => $organizations,
        ]);
    }

    /**
     * Show the form for creating a new organization.
     */
    public function create()
    {
        return Inertia::render('Organizations/Create');
    }

    /**
     * Store a newly created organization in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'logo_url' => 'nullable|url',
        ]);

        $organization = Organization::create([
            'created_by' => $request->user()->id,
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']) . '-' . Str::random(6),
            'description' => $validated['description'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
        ]);

        // Add creator as admin member
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $request->user()->id,
            'role' => 'admin',
        ]);

        return redirect()->route('organizations.show', $organization)
            ->with('success', 'Organization created successfully.');
    }

    /**
     * Display the specified organization.
     */
    public function show(Organization $organization, Request $request)
    {
        // Check if user is a member of this organization
        $isMember = $organization->users()->where('user_id', $request->user()->id)->exists();
        
        if (!$isMember && $organization->created_by !== $request->user()->id) {
            abort(403, 'Unauthorized access to this organization.');
        }

        $organization->load('creator', 'members.user');

        return Inertia::render('Organizations/Show', [
            'organization' => $organization,
            'members' => $organization->members()->with('user')->get(),
            'isAdmin' => $organization->members()
                ->where('user_id', $request->user()->id)
                ->where('role', 'admin')
                ->exists(),
        ]);
    }

    /**
     * Show the settings page for the specified organization.
     */
    public function settings(Organization $organization, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        $organization->load('creator', 'members.user');

        return Inertia::render('Organizations/Settings', [
            'organization' => $organization,
            'members' => $organization->members()->with('user')->get(),
            'isAdmin' => $organization->members()
                ->where('user_id', $request->user()->id)
                ->where('role', 'admin')
                ->exists(),
        ]);
    }

    /**
     * Show the form for editing the specified organization.
     */
    public function edit(Organization $organization, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        return Inertia::render('Organizations/Edit', [
            'organization' => $organization,
        ]);
    }

    /**
     * Update the specified organization in storage.
     */
    public function update(Organization $organization, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'logo_url' => 'nullable|url',
        ]);

        $organization->update($validated);

        return redirect()->route('organizations.show', $organization)
            ->with('success', 'Organization updated successfully.');
    }

    /**
     * Remove the specified organization from storage.
     */
    public function destroy(Organization $organization, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        $organization->delete();

        return redirect()->route('organizations.index')
            ->with('success', 'Organization deleted successfully.');
    }

    /**
     * Invite a user to the organization.
     */
    public function invite(Organization $organization, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Check if user is already a member
        if ($organization->users()->where('user_id', $user->id)->exists()) {
            return back()->with('error', 'User is already a member of this organization.');
        }

        // Add user as member
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => 'member',
        ]);

        return back()->with('success', 'User invited successfully.');
    }

    /**
     * Remove a member from the organization.
     */
    public function removeMember(Organization $organization, OrganizationMember $member, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        // Prevent removing the last admin
        if ($member->role === 'admin' && $organization->members()->where('role', 'admin')->count() === 1) {
            return back()->with('error', 'Cannot remove the last admin from the organization.');
        }

        $member->delete();

        return back()->with('success', 'Member removed successfully.');
    }

    /**
     * Update a member's role.
     */
    public function updateMemberRole(Organization $organization, OrganizationMember $member, Request $request)
    {
        $this->authorizeAdmin($organization, $request->user());

        $validated = $request->validate([
            'role' => 'required|in:admin,member',
        ]);

        $member->update(['role' => $validated['role']]);

        return back()->with('success', 'Member role updated successfully.');
    }

    /**
     * Leave an organization.
     */
    public function leave(Organization $organization, Request $request)
    {
        $member = $organization->members()
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$member) {
            abort(403, 'You are not a member of this organization.');
        }

        // Prevent leaving if you're the last admin
        if ($member->role === 'admin' && $organization->members()->where('role', 'admin')->count() === 1) {
            return back()->with('error', 'Cannot leave organization as the last admin. Promote another member first.');
        }

        $member->delete();

        return redirect()->route('organizations.index')
            ->with('success', 'You have left the organization.');
    }

    /**
     * Authorize that the user is an admin of the organization.
     */
    private function authorizeAdmin(Organization $organization, User $user)
    {
        $isAdmin = $organization->members()
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        if (!$isAdmin) {
            abort(403, 'You must be an admin to perform this action.');
        }
    }
}
