<?php

/*
 * This file is part of the GearmanUI package.
 *
 * (c) Rodolfo Ripado <ggaspaio@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace GearmanUI;

use Silex\Application,
    Silex\ServiceProviderInterface,
    Symfony\Component\HttpFoundation\JsonResponse,
    Symfony\Component\HttpFoundation\Request;

class ControllerProvider implements ServiceProviderInterface {
    public function register(Application $app) {
        $app->get('/', function() use ($app) {
            return $app['twig']->render('index.html.twig', array('settings' => $app['gearmanui.settings']));
        });

        $app->get('/status', function() use ($app) {
            return $app['twig']->render('status.html.twig');
        });

        $app->get('/log', function() use ($app) {
            return $app['twig']->render('log.html.twig');
        });

        $app->get('/data', function(Request $request) use ($app) {
            return new JsonResponse($this->getFileData($request->get('worker')));
        });

        $app->get('/workers', function() use ($app) {
            return $app['twig']->render('workers.html.twig');
        });

        $app->get('/servers', function() use ($app) {
            return $app['twig']->render('servers.html.twig');
        });

        $app->get('/info', function(Request $request) use ($app) {

            if (!$request->isXmlHttpRequest()) {
                $app->abort(404, "Page not found");
            }

            $info = $app['gearman.serverInfo']->getServersInfo();
            return new JsonResponse($info);
            //return $app['twig']->render('gearman.json.twig');
        });
    }


    public function boot(Application $app) {
    }

    private function getFileData($worker) {

        $filename = '/tmp/gearman.worker.' . $worker . '.log';

        $LINES = 100;
        $lines=array();
        $fp = fopen($filename, "r");
        if (!$fp) {
            return '';
        }
        while(!feof($fp))
        {
            $line = fgets($fp, 4096);
            array_unshift($lines, $line);
            if (count($lines) > $LINES)
                array_shift($lines);
        }
        fclose($fp);

        $object = new \stdClass;
        $object->data = \join("", $lines);;
        $data = [0 => $object];

        return $data;
    }
}