import unittest
from pathlib import Path


class BootstrapScriptTest(unittest.TestCase):
    def setUp(self):
        self.script_path = Path(__file__).resolve().parent / "bootstrap.sh"
        self.assertTrue(self.script_path.is_file(), "bootstrap.sh must exist")
        self.script_content = self.script_path.read_text(encoding="utf-8")

    def test_bootstrap_does_not_set_restrictive_global_umask_at_top(self):
        lines = [line.strip() for line in self.script_content.splitlines() if line.strip() and not line.strip().startswith("#")]
        # Global umask 077 at the start breaks standard permissions for global npm/binaries
        self.assertNotIn("umask 077", lines[:5], "Global umask 077 must not be set at the top of bootstrap.sh")

    def test_bootstrap_sets_standard_umask_for_toolchain_installation(self):
        self.assertIn("umask 022", self.script_content, "bootstrap.sh must ensure umask 022 for binary and library installation")

    def test_bootstrap_repairs_world_executable_permissions_on_local_binaries(self):
        self.assertIn(
            "chmod -R a+rX /usr/local/bin /usr/local/lib/node_modules /usr/local/n /usr/local/include /usr/local/share /opt/zettly-agent",
            self.script_content,
            "bootstrap.sh must repair world-readable/executable permissions for CLI tools and libraries",
        )

    def test_bootstrap_verifies_all_required_clis_run_as_worker_user_before_marking_success(self):
        self.assertIn("runuser -u zettly-agent -- ${cmd} --version", self.script_content)
        for cmd in ["node", "npm", "codex", "git", "gh", "php", "composer"]:
            self.assertIn(
                cmd,
                self.script_content,
                f"bootstrap.sh must verify that '{cmd}' executes successfully as the unprivileged zettly-agent user",
            )

    def test_bootstrap_installs_bubblewrap_and_configures_userns(self):
        self.assertIn("bubblewrap", self.script_content, "bootstrap.sh must install bubblewrap for codex sandbox")
        self.assertIn("php-gd", self.script_content, "bootstrap.sh must install php-gd for image tests")
        self.assertIn("kernel.apparmor_restrict_unprivileged_userns=0", self.script_content)

    def test_example_repository_config_prepares_local_environment(self):
        config_path = Path(__file__).resolve().parent / "repositories.example.json"
        content = config_path.read_text(encoding="utf-8")
        self.assertIn('["cp", ".env.example", ".env"]', content)
        self.assertIn('["composer", "install", "--no-interaction", "--prefer-dist"]', content)
        self.assertIn('["php", "artisan", "key:generate"]', content)
        cp_idx = content.find('["cp", ".env.example", ".env"]')
        composer_idx = content.find('["composer", "install"')
        key_idx = content.find('["php", "artisan", "key:generate"]')
        self.assertTrue(cp_idx < composer_idx < key_idx, "composer install must run before key:generate")

    def test_bootstrap_configures_codex_model_provider(self):
        self.assertIn('model_provider = "openai-custom"', self.script_content)
        self.assertIn('model = "agnes-3-0-flash:free"', self.script_content)
        self.assertIn('base_url = "https://kenari.id/v1"', self.script_content)
        self.assertIn('env_key = "CODEX_API_KEY"', self.script_content)

    def test_start_script_exports_codex_api_key(self):
        start_script = Path(__file__).resolve().parent / "start.sh"
        content = start_script.read_text(encoding="utf-8")
        self.assertIn('export CODEX_API_KEY="${openai_key}"', content)

    def test_git_identity_configured_for_worker(self):
        self.assertIn('git config --global user.name "Zettly Coding Agent"', self.script_content)
        self.assertIn('git config --global user.email "technology@edmeeclinic.com"', self.script_content)
        start_script = Path(__file__).resolve().parent / "start.sh"
        start_content = start_script.read_text(encoding="utf-8")
        self.assertIn('git config --global user.name "Zettly Coding Agent"', start_content)
        self.assertIn('git config --global user.email "technology@edmeeclinic.com"', start_content)


if __name__ == "__main__":
    unittest.main()
