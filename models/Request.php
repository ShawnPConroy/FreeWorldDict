<?php
namespace WorldlangDict;

/**
 * Calls the appropriate function based on the url.
 */
class Request
{
    public $lang;
    public $controller;
    public $options;
    public $arguments;
    public $incomplete;
    public $path;
    public $linkQuery;
    
    public function __construct($config)
    {
        $parsedUrl = parse_url(strtolower($_SERVER['REQUEST_URI']));
        $this->path = explode('/', $parsedUrl['path']);
        
        if (isset($parsedUrl['query'])) {
            $this->linkQuery = '?'.$parsedUrl['query'];
            parse_str($parsedUrl['query'], $this->options);
        } else {
            $this->linkQuery = null;
            $this->options = null;
        }
        
        // Find num of parameters by comparing path to URI (minus 3 for domain)
        $requestSize = sizeof($this->path);
        if (empty($this->path[$requestSize-1])) {
            $requestSize -= 1;
        }
        $requestSkip = sizeof(explode('/', $config->siteUri))-3;
        $requestSize = $requestSize-$requestSkip;
        
        // Let's get to the request content!
        $this->lang = $config->lang;
        $this->controller = 'index';
        $this->arguments = null;
        
        if ($requestSize >= 1) {
            $this->lang = $this->path[$requestSkip];
            if ($requestSize >= 2) {
                $this->controller = $this->path[$requestSkip+1];
                if ($requestSize >= 3) {
                    for ($i = 2; $i < $requestSize; $i++) {
                        $this->arguments[$i-2] = urldecode($this->path[$requestSkip+$i]);
                    }
                }
            }
        }
        
        if ($requestSize <= 0) {
            $this->incomplete = true;
        } else {
            $this->incomplete = false;
        }
    }
}
