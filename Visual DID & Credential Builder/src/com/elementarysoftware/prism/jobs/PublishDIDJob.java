package com.elementarysoftware.prism.jobs;

import com.elementarysoftware.prism.DID;

import publishDid.PrismNodePublishAction;

public class PublishDIDJob implements Runnable {

	private DID did;

	public PublishDIDJob(DID d) {
		did = d;
	}

	public void run() {
		String operationHash = "";
		operationHash = PrismNodePublishAction.Companion.publishDid(did.getSeed());
		if(operationHash != "") {
			did.setLatestOperationHash(operationHash);	
		}
	}

}
