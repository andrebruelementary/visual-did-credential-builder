package com.elementarysoftware.prism.jobs;

import java.io.FileNotFoundException;
import java.io.IOException;

import com.elementarysoftware.prism.DID;

import publishDid.PrismNodePublishAction;

public class PublishDIDJob implements Runnable {

	private DID did;

	public PublishDIDJob(DID d) {
		did = d;
	}

	public void run() {
		String operationHash = "";
		try {
			operationHash = PrismNodePublishAction.Companion.publishDid(did.getSeed());
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		if(operationHash != "") {
			did.setLatestOperationHash(operationHash);	
		}
	}

}
