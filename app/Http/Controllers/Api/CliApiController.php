<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Drawing;
use App\Models\Focus;
use App\Models\Habit;
use App\Models\HabitStreak;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\TodoAttachment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CliApiController extends Controller
{
    public function habits(Request $request): JsonResponse
    {
        $habits = Habit::accessibleBy(Auth::id(), $request->integer('organization_id') ?: null)
            ->with(['entries' => fn ($query) => $query->whereDate('date', today()), 'streak'])
            ->latest()->get();

        return response()->json(['data' => $habits]);
    }

    public function showHabit(Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit);
        return response()->json(['data' => $habit->load(['entries' => fn ($query) => $query->latest('date')->limit(90), 'streak'])]);
    }

    public function showFocus(Focus $focus): JsonResponse
    {
        abort_unless($focus->user_id === Auth::id(), 403);
        return response()->json(['data' => $focus->load('statusEvents')]);
    }

    public function attachments(): JsonResponse
    {
        $items = TodoAttachment::whereHas('todo', fn ($query) => $query->where('user_id', Auth::id()))
            ->with('todo:id,title')->latest()->get();
        return response()->json(['data' => $items]);
    }

    public function showAttachment(TodoAttachment $attachment): JsonResponse
    {
        abort_unless($attachment->todo()->where('user_id', Auth::id())->exists(), 403);
        return response()->json(['data' => $attachment->load('todo:id,title')]);
    }

    public function createHabit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255', 'description' => 'nullable|string|max:1000',
            'color' => 'required|string|max:7', 'icon' => 'required|string|max:50',
            'target_frequency' => 'required|integer|min:1|max:100',
            'frequency_period' => 'required|in:daily,weekly,monthly',
            'organization_id' => 'nullable|integer|exists:organizations,id',
        ]);
        if (! empty($data['organization_id']) && ! Auth::user()->organizations()->whereKey($data['organization_id'])->exists()) {
            abort(403);
        }
        $habit = Habit::create(['user_id' => Auth::id(), ...$data]);
        HabitStreak::create(['habit_id' => $habit->id, 'current_streak' => 0, 'longest_streak' => 0]);

        return response()->json(['data' => $habit], 201);
    }

    public function updateHabit(Request $request, Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit);
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255', 'description' => 'nullable|string|max:1000',
            'color' => 'sometimes|required|string|max:7', 'icon' => 'sometimes|required|string|max:50',
            'target_frequency' => 'sometimes|required|integer|min:1|max:100',
            'frequency_period' => 'sometimes|required|in:daily,weekly,monthly', 'is_active' => 'sometimes|boolean',
        ]);
        $habit->update($data);
        return response()->json(['data' => $habit->fresh()]);
    }

    public function deleteHabit(Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit);
        $habit->delete();
        return response()->json(['success' => true]);
    }

    public function toggleHabit(Request $request, Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit);
        $count = $request->integer('count', 1);
        $entry = $habit->entries()->whereDate('date', today())->first();
        if ($count < 1) $entry?->delete();
        elseif ($entry) $entry->update(['count' => $count, 'notes' => $request->input('notes')]);
        else $habit->entries()->create(['date' => today(), 'count' => $count, 'notes' => $request->input('notes')]);

        return response()->json(['completed' => $habit->isCompletedToday(), 'count' => $habit->getTodayCount(), 'target_met' => $habit->isTodayTargetMet()]);
    }

    public function habitStats(Habit $habit): JsonResponse
    {
        $this->authorizeHabit($habit);
        $entries = $habit->entriesBetween(request('start_date', today()->subDays(30)), request('end_date', today()))->get();
        $days = today()->parse(request('start_date', today()->subDays(30)))->diffInDays(today()->parse(request('end_date', today()))) + 1;

        return response()->json([
            'total_completions' => $entries->sum('count'),
            'completed_days' => $entries->filter(fn ($entry) => $entry->count >= $habit->target_frequency)->count(),
            'total_days' => $days,
            'current_streak' => $habit->streak()->value('current_streak') ?? 0,
            'longest_streak' => $habit->streak()->value('longest_streak') ?? 0,
        ]);
    }

    public function drawings(): JsonResponse
    {
        return response()->json(['data' => Drawing::where('user_id', Auth::id())->latest()->get(['id', 'title', 'thumbnail', 'updated_at'])]);
    }

    public function organizations(): JsonResponse
    {
        return response()->json(['data' => Auth::user()->organizations()->withPivot('role')->get()]);
    }

    public function profile(): JsonResponse
    {
        $user = Auth::user();
        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'workspace_view', 'created_at']),
            'tokens' => $user->tokens()->latest()->get(['id', 'name', 'abilities', 'last_used_at', 'created_at']),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,'.Auth::id(),
            'workspace_view' => 'sometimes|required|in:matrix,kanban',
        ]);
        $user = Auth::user();
        if (isset($data['email']) && $data['email'] !== $user->email) $user->email_verified_at = null;
        $user->fill($data)->save();
        return response()->json(['user' => $user->only(['id', 'name', 'email', 'workspace_view', 'created_at'])]);
    }

    public function deleteProfile(Request $request): JsonResponse
    {
        $password = $request->validate(['password' => 'required|string'])['password'];
        if (! Hash::check($password, Auth::user()->password)) {
            return response()->json(['message' => 'The password is incorrect.'], 422);
        }
        $user = Auth::user();
        $user->tokens()->delete();
        $user->delete();
        return response()->json(['success' => true]);
    }

    public function issueCliToken(Request $request): JsonResponse
    {
        $name = $request->validate(['name' => 'required|string|max:255'])['name'];
        $token = Auth::user()->createToken($name, ['zettly:cli']);
        return response()->json(['id' => $token->accessToken->id, 'name' => $name, 'abilities' => ['zettly:cli'], 'token' => $token->plainTextToken], 201);
    }

    public function deleteToken(int $token): JsonResponse
    {
        $deleted = Auth::user()->tokens()->whereKey($token)->delete();
        abort_unless($deleted, 404);
        return response()->json(['success' => true]);
    }

    public function pushStatus(): JsonResponse
    {
        $subscriptions = Auth::user()->pushSubscriptions();
        return response()->json(['count' => $subscriptions->count(), 'subscriptions' => $subscriptions->get(['id', 'created_at'])]);
    }

    public function createOrganization(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:255', 'description' => 'nullable|string|max:1000', 'logo_url' => 'nullable|url']);
        $org = Organization::create([
            'created_by' => Auth::id(), 'name' => $data['name'], 'slug' => Str::slug($data['name']).'-'.Str::random(6),
            'description' => $data['description'] ?? null, 'logo_url' => $data['logo_url'] ?? null,
        ]);
        $org->members()->create(['user_id' => Auth::id(), 'role' => 'admin']);
        return response()->json(['data' => $org], 201);
    }

    public function showOrganization(Organization $organization): JsonResponse
    {
        $this->authorizeMember($organization);
        return response()->json(['data' => $organization->load('members.user:id,name,email')]);
    }

    public function updateOrganization(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeAdmin($organization);
        $organization->update($request->validate(['name' => 'sometimes|required|string|max:255', 'description' => 'nullable|string|max:1000', 'logo_url' => 'nullable|url']));
        return response()->json(['data' => $organization->fresh()]);
    }

    public function deleteOrganization(Organization $organization): JsonResponse
    {
        $this->authorizeAdmin($organization);
        $organization->delete();
        return response()->json(['success' => true]);
    }

    public function inviteOrganizationMember(Request $request, Organization $organization): JsonResponse
    {
        $this->authorizeAdmin($organization);
        $user = User::where('email', $request->validate(['email' => 'required|email|exists:users,email'])['email'])->firstOrFail();
        if ($organization->users()->whereKey($user->id)->exists()) return response()->json(['message' => 'User is already a member.'], 409);
        $member = $organization->members()->create(['user_id' => $user->id, 'role' => 'member']);
        return response()->json(['data' => $member->load('user:id,name,email')], 201);
    }

    public function updateMemberRole(Request $request, Organization $organization, OrganizationMember $member): JsonResponse
    {
        $this->authorizeAdmin($organization);
        abort_unless($member->organization_id === $organization->id, 404);
        $role = $request->validate(['role' => 'required|in:admin,member'])['role'];
        if ($member->role === 'admin' && $role !== 'admin' && $organization->members()->where('role', 'admin')->count() === 1) {
            return response()->json(['message' => 'Cannot remove the last admin.'], 409);
        }
        $member->update(['role' => $role]);
        return response()->json(['data' => $member->fresh()]);
    }

    public function removeOrganizationMember(Organization $organization, OrganizationMember $member): JsonResponse
    {
        $this->authorizeAdmin($organization);
        abort_unless($member->organization_id === $organization->id, 404);
        if ($member->role === 'admin' && $organization->members()->where('role', 'admin')->count() === 1) return response()->json(['message' => 'Cannot remove the last admin.'], 409);
        $member->delete();
        return response()->json(['success' => true]);
    }

    public function leaveOrganization(Organization $organization): JsonResponse
    {
        $member = $organization->members()->where('user_id', Auth::id())->firstOrFail();
        if ($member->role === 'admin' && $organization->members()->where('role', 'admin')->count() === 1) return response()->json(['message' => 'Promote another admin before leaving.'], 409);
        $member->delete();
        return response()->json(['success' => true]);
    }

    private function authorizeHabit(Habit $habit): void
    {
        if ($habit->user_id !== Auth::id() && (! $habit->organization_id || ! Auth::user()->organizations()->whereKey($habit->organization_id)->exists())) {
            abort(403);
        }
    }

    private function authorizeMember(Organization $organization): void
    {
        abort_unless($organization->members()->where('user_id', Auth::id())->exists(), 403);
    }

    private function authorizeAdmin(Organization $organization): void
    {
        abort_unless($organization->members()->where('user_id', Auth::id())->where('role', 'admin')->exists(), 403);
    }
}
