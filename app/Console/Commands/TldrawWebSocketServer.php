<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use App\WebSocket\TLDrawSyncHandler;

class TldrawWebSocketServer extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tldraw:websocket {--port=8080 : The port to run the WebSocket server on}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Start the TLDraw WebSocket server for real-time synchronization';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $port = $this->option('port');
        
        $this->info("Starting TLDraw WebSocket server on port {$port}...");
        
        $server = IoServer::factory(
            new HttpServer(
                new WsServer(
                    new TLDrawSyncHandler()
                )
            ),
            $port
        );
        
        $this->info("WebSocket server started successfully!");
        $this->info("Listening on ws://localhost:{$port}");
        $this->info("Press Ctrl+C to stop the server");
        
        $server->run();
    }
}
